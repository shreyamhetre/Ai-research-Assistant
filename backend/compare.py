"""Cross-paper comparison with CrewAI: where do the selected papers agree or contradict?

Crew layout
  * one *Evidence Researcher* agent per paper, restricted (via its search tool) to that paper
  * one *Cross-paper Critic* that reads every researcher's findings and produces the comparison

CrewAI needs Python 3.10-3.13 (see requirements.txt). The import is lazy so the rest of the
app keeps working without it; the endpoint reports a clear error instead.
"""
import json
import logging
import os
from typing import List, Optional, Type

import db
import retrieval
from config import Config

log = logging.getLogger(__name__)

# Keep usage data private: CrewAI sends anonymous telemetry unless told otherwise.
os.environ.setdefault("CREWAI_DISABLE_TELEMETRY", "true")
os.environ.setdefault("OTEL_SDK_DISABLED", "true")

STANCES = {"agrees", "disagrees", "partial", "not_mentioned"}
VERDICTS = {"consensus", "contradiction", "partial", "single"}


class CrewUnavailable(Exception):
    pass


class BadRequest(Exception):
    pass


def _import_crewai():
    try:
        from crewai import LLM, Agent, Crew, Process, Task
        from crewai.tools import BaseTool
    except ImportError as e:  # pragma: no cover - depends on the environment
        raise CrewUnavailable(
            "CrewAI is not installed. It requires Python 3.10-3.13: create the backend venv "
            "with Python 3.12 and run `pip install -r requirements.txt`."
        ) from e
    return LLM, Agent, Crew, Process, Task, BaseTool


def _build_models():
    from pydantic import BaseModel, Field

    class Claim(BaseModel):
        claim: str = Field(description="One concrete claim the paper makes about the topic")
        pages: List[int] = Field(default_factory=list, description="Page numbers supporting it")

    class PaperFindings(BaseModel):
        paper: str
        claims: List[Claim] = Field(default_factory=list)

    class Position(BaseModel):
        paper: str
        stance: str = Field(description="agrees | disagrees | partial | not_mentioned")
        claim: str = Field(default="", description="What this paper says on the point")
        pages: List[int] = Field(default_factory=list)

    class Point(BaseModel):
        point: str = Field(description="A specific question or claim the papers address")
        verdict: str = Field(description="consensus | contradiction | partial | single")
        positions: List[Position]

    class Comparison(BaseModel):
        summary: str = Field(description="2-4 sentence synthesis of how the papers relate")
        points: List[Point]

    return PaperFindings, Comparison


def _search_tool(BaseTool, paper_title: str):
    from pydantic import BaseModel, Field

    class SearchInput(BaseModel):
        query: str = Field(description="What to look for in the paper")

    class SearchPaperTool(BaseTool):
        name: str = "search_paper"
        description: str = (
            "Search the one paper assigned to you and return the most relevant passages with "
            "page numbers. Call it several times with different queries to be thorough."
        )
        args_schema: Type[BaseModel] = SearchInput
        paper: str = ""

        def _run(self, query: str) -> str:
            hits = retrieval.expand(retrieval.retrieve(query, self.paper, mode="full", k=4))
            if not hits:
                return "No relevant passages found."
            return "\n\n".join(f"(page {h['page']}) {h['context']}" for h in hits)

    return SearchPaperTool(paper=paper_title)


def _clean(result: dict, titles: List[str]) -> dict:
    """Normalise model output so the UI can rely on it."""
    points = []
    for p in result.get("points", []):
        positions = []
        for pos in p.get("positions", []):
            stance = str(pos.get("stance", "")).lower().replace(" ", "_")
            positions.append({
                "paper": pos.get("paper", ""),
                "stance": stance if stance in STANCES else "partial",
                "claim": pos.get("claim", ""),
                "pages": sorted({int(x) for x in pos.get("pages", []) if isinstance(x, int)}),
            })
        verdict = str(p.get("verdict", "")).lower()
        points.append({
            "point": p.get("point", ""),
            "verdict": verdict if verdict in VERDICTS else "partial",
            "positions": positions,
        })
    return {"papers": titles, "summary": result.get("summary", ""), "points": points}


def compare_papers(titles: List[str], topic: str) -> dict:
    topic = (topic or "").strip()
    titles = list(dict.fromkeys(titles or []))
    if not topic:
        raise BadRequest("Enter a topic or question to compare on.")
    if not 2 <= len(titles) <= Config.COMPARE_MAX_PAPERS:
        raise BadRequest(f"Select between 2 and {Config.COMPARE_MAX_PAPERS} papers.")
    known = set(db.list_titles())
    missing = [t for t in titles if t not in known]
    if missing:
        raise BadRequest(f"Unknown paper: {missing[0]}")
    if not Config.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set")

    LLM, Agent, Crew, Process, Task, BaseTool = _import_crewai()
    PaperFindings, Comparison = _build_models()
    llm = LLM(model=f"openai/{Config.CHAT_MODEL}", api_key=Config.OPENAI_API_KEY, temperature=0.1)

    agents, extract_tasks = [], []
    for title in titles:
        researcher = Agent(
            role=f"Evidence Researcher for '{title}'",
            goal=f"Find what '{title}' actually says about the topic, with page numbers.",
            backstory=("A careful research assistant who only reports what the paper states, "
                       "never guesses, and says so when the paper does not cover the topic."),
            tools=[_search_tool(BaseTool, title)],
            llm=llm, allow_delegation=False, verbose=False, max_iter=5,
        )
        agents.append(researcher)
        extract_tasks.append(Task(
            description=(f"Topic: {topic}\n\nUse the search tool to find the claims that the paper "
                         f"'{title}' makes about this topic. Run at least two different searches. "
                         "Report 2-6 concrete claims with the pages they come from. If the paper "
                         "does not address the topic, return an empty claims list."),
            expected_output="Structured findings for this paper.",
            agent=researcher,
            output_pydantic=PaperFindings,
        ))

    critic = Agent(
        role="Cross-paper Critic",
        goal="Compare the papers' findings and identify consensus and contradictions.",
        backstory=("A rigorous reviewer who compares claims side by side, is precise about "
                   "disagreements, and never attributes a claim to a paper that did not make it."),
        llm=llm, allow_delegation=False, verbose=False,
    )
    compare_task = Task(
        description=(f"Topic: {topic}\n\nUsing ONLY the researchers' findings, produce 3-6 "
                     "comparison points. For each point give a verdict (consensus, contradiction, "
                     "partial, or single when only one paper covers it) and one position per paper "
                     "with stance agrees/disagrees/partial/not_mentioned, the paper's claim, and "
                     "pages. End with a short synthesis."),
        expected_output="A structured comparison of the papers.",
        agent=critic,
        context=extract_tasks,
        output_pydantic=Comparison,
    )

    crew = Crew(agents=agents + [critic], tasks=extract_tasks + [compare_task],
                process=Process.sequential, verbose=False)
    output = crew.kickoff()

    parsed: Optional[object] = getattr(output, "pydantic", None)
    if parsed is not None:
        data = parsed.model_dump()
    else:  # model answered with JSON text instead of the structured object
        data = json.loads(getattr(output, "raw", "") or "{}")
    return {"topic": topic, **_clean(data, titles)}
