"""Business logic: ingest, summarise, quiz, and cited Q&A."""
import logging
from typing import Dict, List, Optional

import db
import llm
from config import Config
from utils.pdf_parser import chunk_pages, extract_pages

log = logging.getLogger(__name__)

# Above this many characters, summarise in pieces (map-reduce).
DIRECT_LIMIT = 60_000
PIECE = 40_000


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


def summarize(title: str) -> str:
    text = _paper_text(title)
    system = ("You are a research assistant. Write clear, accurate summaries of academic "
              "papers. Use Markdown with these sections: **Overview**, **Key Contributions**, "
              "**Method**, **Results**, **Limitations**. Be concise.")
    if len(text) <= DIRECT_LIMIT:
        return llm.chat(system, f"Paper: {title}\n\n{text}")

    parts = [text[i:i + PIECE] for i in range(0, len(text), PIECE)]
    notes = [llm.chat("Summarise this excerpt of a paper in dense bullet points.", p)
             for p in parts]
    return llm.chat(system, f"Paper: {title}\n\nNotes from each part:\n\n" + "\n\n".join(notes))


def make_mcqs(title: str, n: int = 5) -> List[Dict]:
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
    return out


def answer(query: str, title: Optional[str] = None) -> Dict:
    hits = db.search(llm.embed_query(query), Config.TOP_K, title)
    hits = [h for h in hits if h["distance"] <= Config.MAX_DISTANCE]

    if not hits:
        system = ("You are a research assistant. The user's papers had nothing relevant to "
                  "this question. Answer briefly from general knowledge and state clearly that "
                  "this is not from their uploaded papers.")
        return {"response": llm.chat(system, query), "sources": [], "grounded": False}

    context = "\n\n".join(
        f"[{i}] ({h['title']}, p.{h['page']})\n{h['content']}" for i, h in enumerate(hits, 1)
    )
    system = (
        "You are a research assistant. Answer using ONLY the numbered excerpts. "
        "Cite sources inline like [1], [2]. If the excerpts don't contain the answer, say so. "
        "Use concise Markdown."
    )
    reply = llm.chat(system, f"Excerpts:\n{context}\n\nQuestion: {query}")
    sources = [{"id": i, "title": h["title"], "page": h["page"],
                "snippet": h["content"][:240]} for i, h in enumerate(hits, 1)]
    return {"response": reply, "sources": sources, "grounded": True}
