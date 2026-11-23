"""Study Assistant: a CrewAI agent that answers doubts, summarises papers and runs quizzes.

One agent with four tools, each reusing code the rest of the app already relies on:
  search_papers        hybrid retrieval + reranking (optionally one paper), returns numbered passages
  summarize_paper      cached summary
  generate_quiz        new multiple-choice questions, saved as spaced-repetition cards
  review_due_questions saved cards that are due for review

Tools record structured results (citations, quiz, summary) in a per-request RunState, so the UI
does not depend on the model formatting JSON; the agent only writes the chat text.

CrewAI needs Python 3.10-3.13. The import is lazy: without it the assistant falls back to plain
RAG for questions, and the rest of the app keeps working.
"""
import logging
import os
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Tuple

import db
import db_extra
import retrieval
import services
from config import Config

log = logging.getLogger(__name__)

# Keep usage data private: CrewAI sends anonymous telemetry unless told otherwise.
os.environ.setdefault("CREWAI_DISABLE_TELEMETRY", "true")
os.environ.setdefault("OTEL_SDK_DISABLED", "true")


class CrewUnavailable(Exception):
    pass


@dataclass
class RunState:
    """Everything the tools produce during one request."""
    scope: List[str] = field(default_factory=list)       # papers selected in the UI ([] = all)
    sources: List[Dict] = field(default_factory=list)
    quiz: List[Dict] = field(default_factory=list)
    summary: Optional[Dict] = None
    tools_used: List[str] = field(default_factory=list)
    _seen: Dict[int, int] = field(default_factory=dict)  # chunk id -> citation number

    def cite(self, hit: Dict) -> int:
        """Stable citation number for a chunk (same chunk, same number, across tool calls)."""
        if hit["id"] not in self._seen:
            self._seen[hit["id"]] = len(self._seen) + 1
            self.sources.append({"id": self._seen[hit["id"]], "title": hit["title"],
                                 "page": hit["page"], "snippet": hit["content"][:240]})
        return self._seen[hit["id"]]

    def used(self, name: str) -> None:
        if name not in self.tools_used:
            self.tools_used.append(name)


def _import_crewai():
    try:
        from crewai import LLM, Agent, Crew, Process, Task
        from crewai.tools import tool
    except ImportError as e:  # depends on the environment
        raise CrewUnavailable("CrewAI is not installed (it needs Python 3.10-3.13).") from e
    return LLM, Agent, Crew, Process, Task, tool


# ---------------------------------------------------------------- tools
def _find_title(paper: str, known: List[str]) -> Tuple[Optional[str], Optional[str]]:
    """Exact (case-insensitive) match, else a unique substring match. Returns (title, error)."""
    wanted = paper.strip().lower()
    for t in known:
        if t.lower() == wanted:
            return t, None
    matches = [t for t in known if wanted in t.lower()]
    if len(matches) == 1:
        return matches[0], None
    return None, f"Unknown paper '{paper}'. Available papers: " + "; ".join(known)


def build_tools(state: RunState, known: List[str], tool: Callable) -> Dict[str, Callable]:
    """The agent's tools, closed over this request's state. `tool` is CrewAI's decorator."""

    def one_paper(paper: str) -> Tuple[Optional[str], Optional[str]]:
        if (paper or "").strip():
            return _find_title(paper, known)
        candidates = state.scope or known
        if len(candidates) == 1:
            return candidates[0], None
        return None, "Say which paper you mean (exact title). Available papers: " + "; ".join(known)

    @tool("search_papers")
    def search_papers(query: str, paper: str) -> str:
        """Search the user's papers for passages relevant to a query. Use it for any question
        about what the papers say. 'paper' is an exact paper title, or an empty string to search
        all selected papers. Returns numbered passages; cite them in your answer as [n]."""
        state.used("search_papers")
        target: object = state.scope or None
        if (paper or "").strip():
            target, error = _find_title(paper, known)
            if error:
                return error
        hits = retrieval.retrieve(query, target, mode="full", k=4)
        if retrieval.looks_off_topic(hits):
            return "No relevant passages found in the papers for this query."
        hits = retrieval.expand(hits)
        return "\n\n".join(
            f"[{state.cite(h)}] ({h['title']}, p.{h['page']})\n{h['context']}" for h in hits)

    @tool("summarize_paper")
    def summarize_paper(paper: str) -> str:
        """Get a structured summary of one paper. 'paper' is the exact title (may be empty if
        only one paper is selected). The summary is shown to the user automatically in a card."""
        state.used("summarize_paper")
        title, error = one_paper(paper)
        if error:
            return error
        text, _cached = services.summarize(title)
        state.summary = {"title": title, "text": text}
        return (f"Summary of '{title}' (already displayed to the user; do not repeat it in full):\n"
                f"{text}")

    @tool("generate_quiz")
    def generate_quiz(paper: str) -> str:
        """Create five multiple-choice questions about one paper. 'paper' is the exact title (may
        be empty if only one paper is selected). The quiz is shown to the user automatically."""
        state.used("generate_quiz")
        title, error = one_paper(paper)
        if error:
            return error
        questions = services.make_mcqs(title)
        if not questions:
            return "Could not generate questions for this paper."
        state.quiz = questions
        return (f"Created {len(questions)} multiple-choice questions on '{title}'. They are shown "
                "to the user as an interactive quiz; do not list them in your reply.")

    @tool("review_due_questions")
    def review_due_questions(paper: str) -> str:
        """Bring back saved quiz questions that are due for spaced-repetition review. 'paper' is
        an exact title, or an empty string for all papers. Shown to the user automatically."""
        state.used("review_due_questions")
        title = None
        if (paper or "").strip():
            title, error = _find_title(paper, known)
            if error:
                return error
        due = db_extra.due_cards(title, limit=5)
        if not due["cards"]:
            return (f"No questions are due for review right now ({due['total']} saved in total)."
                    if due["total"] else "There are no saved quiz questions yet; offer to generate a quiz.")
        state.quiz = due["cards"]
        return f"{len(due['cards'])} questions are due. They are shown to the user as an interactive quiz."

    return {
        "search_papers": search_papers,
        "summarize_paper": summarize_paper,
        "generate_quiz": generate_quiz,
        "review_due_questions": review_due_questions,
    }


# ---------------------------------------------------------------- agent
# {placeholders} are filled by CrewAI from kickoff(inputs=...), so braces inside the values
# (a user message, a paper title) can never break the template.
TASK = """You are helping a student with their research papers.

Papers in the library:
{titles}

Selected scope: {scope}

{history}User message: {message}

How to work:
- Questions or doubts about what the papers say: call search_papers with a focused query (rewrite
  the question into search terms; search again with another query, or once per paper, if needed).
  Answer ONLY from the returned passages and cite them inline as [n] using the numbers returned.
  If the passages do not contain the answer, say so, then answer briefly from general knowledge and
  label it clearly as not from the papers.
- Comparing papers: search each paper separately (use the paper argument), then contrast what each
  says, with citations.
- Summary requests: call summarize_paper. The summary appears in a card automatically, so reply with
  at most one or two sentences.
- Quiz, MCQ or "test me" requests: call generate_quiz. For "review" or "what is due": call
  review_due_questions. The quiz appears automatically; do not list the questions.
- Greetings or questions unrelated to the papers: answer briefly without tools.
- Use the exact paper titles listed above. Keep replies concise, in Markdown."""


def _history_text(history: List[Dict]) -> str:
    if not history:
        return ""
    lines = [f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}" for m in history]
    return "Conversation so far:\n" + "\n".join(lines) + "\n\n"


def _fallback(message: str, scope: List[str], history: Optional[List[Dict]]) -> Dict:
    """No CrewAI: answer questions with plain RAG so the app still works."""
    title = scope[0] if len(scope) == 1 else None
    result = services.answer(message, title, history)
    return {**result, "quiz": None, "summary": None, "tools_used": [], "agent": False}


def run(message: str, titles: Optional[List[str]] = None,
        history: Optional[List[Dict]] = None) -> Dict:
    known = db.list_titles()
    scope = [t for t in (titles or []) if t in known]
    history = services._clean_history(history)

    try:
        LLM, Agent, Crew, Process, Task, tool = _import_crewai()
    except CrewUnavailable:
        log.warning("CrewAI unavailable; answering with plain RAG")
        return _fallback(message, scope, history)
    if not Config.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set")

    state = RunState(scope=scope)
    tools = build_tools(state, known, tool)
    llm = LLM(model=f"openai/{Config.CHAT_MODEL}", api_key=Config.OPENAI_API_KEY,
              temperature=0.1, timeout=90)

    agent = Agent(
        role="Study Assistant",
        goal="Help the student understand their research papers: answer doubts with cited "
             "evidence, summarise papers, and quiz them.",
        backstory="A careful research tutor who only states what the papers say, always cites "
                  "passages, and is upfront when something is not covered.",
        tools=list(tools.values()),
        llm=llm, allow_delegation=False, verbose=False, max_iter=Config.AGENT_MAX_ITER,
    )
    task = Task(
        description=TASK,
        expected_output="A concise Markdown reply, with [n] citations when the papers were used.",
        agent=agent,
    )
    crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
    output = crew.kickoff(inputs={
        "titles": "\n".join(f"- {t}" for t in known) or "(none yet)",
        "scope": ", ".join(scope) if scope else "all papers",
        "history": _history_text(history),
        "message": message,
    })

    text = (getattr(output, "raw", None) or str(output)).strip()
    return {
        "response": text or "I couldn't produce an answer. Please try rephrasing.",
        "sources": state.sources,
        "grounded": bool(state.sources or state.quiz or state.summary),
        "quiz": state.quiz or None,
        "summary": state.summary,
        "tools_used": state.tools_used,
        "agent": True,
    }
