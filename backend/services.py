"""Business logic: ingest, summarise, quiz, and cited Q&A."""
import logging
from typing import Dict, List, Optional, Tuple

import db
import db_extra
import llm
import retrieval
from config import Config
from utils.pdf_parser import chunk_pages, extract_pages

log = logging.getLogger(__name__)

# Above this many characters, summarise in pieces (map-reduce).
DIRECT_LIMIT = 60_000
PIECE = 40_000
HISTORY_CHARS = 600


class NotFound(Exception):
    pass


def ingest(title: str, pdf_bytes: bytes) -> int:
    pages = extract_pages(pdf_bytes)
    chunks = chunk_pages(pages)
    if not chunks:
        raise ValueError("No extractable text found (scanned PDF?)")
    embeddings = llm.embed_documents([c[1] for c in chunks])
    rows = [(page, text, emb) for (page, text), emb in zip(chunks, embeddings)]
    db.store_paper(title, pdf_bytes, rows)
    return len(rows)


def _paper_text(title: str) -> str:
    text = db.get_paper_text(title)
    if not text:
        raise NotFound(title)
    return text


# ------------------------------------------------------------------ summaries (cached)
def summarize(title: str, refresh: bool = False) -> Tuple[str, bool]:
    """Returns (summary, from_cache). `refresh` bypasses and replaces the cached copy."""
    if not refresh:
        cached = db_extra.get_artifact(title, "summary")
        if cached:
            return cached, True

    text = _paper_text(title)
    system = ("You are a research assistant. Write clear, accurate summaries of academic "
              "papers. Use Markdown with these sections: **Overview**, **Key Contributions**, "
              "**Method**, **Results**, **Limitations**. Be concise.")
    if len(text) <= DIRECT_LIMIT:
        summary = llm.chat(system, f"Paper: {title}\n\n{text}")
    else:
        parts = [text[i:i + PIECE] for i in range(0, len(text), PIECE)]
        notes = [llm.chat("Summarise this excerpt of a paper in dense bullet points.", p) for p in parts]
        summary = llm.chat(system, f"Paper: {title}\n\nNotes from each part:\n\n" + "\n\n".join(notes))

    db_extra.set_artifact(title, "summary", summary)
    return summary, False


# ------------------------------------------------------------------ quiz
def make_mcqs(title: str, n: int = 5) -> List[Dict]:
    """Generate questions and save them as spaced-repetition cards (returned with ids)."""
    text = _paper_text(title)[:DIRECT_LIMIT]
    system = (
        "You write multiple-choice questions that test understanding of a paper. "
        'Return JSON: {"questions": [{"question": str, "options": [4 strings, no letter prefixes], '
        '"answer_index": 0-3, "explanation": str}]}. Exactly one option is correct; '
        "distractors must be plausible."
    )
    data = llm.chat_json(system, f"Create {n} questions from this paper:\n\n{text}")
    out = []
    for q in data.get("questions", []):
        opts = q.get("options", [])
        idx = q.get("answer_index")
        if len(opts) == 4 and isinstance(idx, int) and 0 <= idx < 4 and q.get("question"):
            out.append({
                "question": q["question"],
                "options": opts,
                "answer_index": idx,
                "explanation": q.get("explanation", ""),
            })
    return db_extra.save_cards(title, out) if out else out


# ------------------------------------------------------------------ cited Q&A
def _clean_history(history: Optional[List[Dict]]) -> List[Dict]:
    """Keep the last few well-formed messages, each trimmed."""
    out = []
    for m in (history or [])[-Config.HISTORY_MESSAGES:]:
        role, content = m.get("role"), (m.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            out.append({"role": role, "content": content[:HISTORY_CHARS]})
    return out


def _history_text(history: List[Dict]) -> str:
    if not history:
        return ""
    lines = [f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}" for m in history]
    return "Conversation so far:\n" + "\n".join(lines) + "\n\n"


def _general_answer(query: str, history: List[Dict]) -> Dict:
    system = ("You are a research assistant. The user's uploaded papers do not cover this "
              "question. Answer briefly from general knowledge and state clearly that this is "
              "not from their uploaded papers. Use concise Markdown.")
    return {"response": llm.chat(system, _history_text(history) + f"Question: {query}"),
            "sources": [], "grounded": False}


def answer(query: str, title: Optional[str] = None, history: Optional[List[Dict]] = None) -> Dict:
    history = _clean_history(history)

    # Short follow-ups ("and the second one?") carry no topic: borrow the last user question.
    search_query = query
    if history and len(query.split()) < 8:
        previous = next((m["content"] for m in reversed(history) if m["role"] == "user"), "")
        search_query = f"{previous} {query}".strip()

    hits = retrieval.retrieve(search_query, title, mode="full")
    if retrieval.looks_off_topic(hits):
        return _general_answer(query, history)

    hits = retrieval.expand(hits)  # add the neighbouring chunks for context
    context = "\n\n".join(
        f"[{i}] ({h['title']}, p.{h['page']})\n{h['context']}" for i, h in enumerate(hits, 1)
    )
    system = (
        "You are a research assistant answering questions about the user's papers. You get "
        "numbered excerpts. If they contain the answer, answer using ONLY the excerpts, cite "
        "sources inline like [1] or [2][3], and set grounded to true. If they do NOT contain "
        "the answer, set grounded to false and answer briefly from general knowledge, stating "
        "clearly that this is not from the uploaded papers (no citations then). "
        'Reply as JSON: {"grounded": boolean, "answer": string}. The answer uses concise Markdown.'
    )
    data = llm.chat_json(
        system, f"{_history_text(history)}Excerpts:\n{context}\n\nQuestion: {query}", temperature=0.2)
    reply = (data.get("answer") or "").strip()
    if not reply:
        return _general_answer(query, history)

    if not data.get("grounded"):
        return {"response": reply, "sources": [], "grounded": False}

    sources = [{"id": i, "title": h["title"], "page": h["page"],
                "snippet": h["content"][:240]} for i, h in enumerate(hits, 1)]
    return {"response": reply, "sources": sources, "grounded": True}
