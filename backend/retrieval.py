"""Retrieval pipeline: dense, hybrid (dense + keyword, RRF) and hybrid + cross-encoder rerank."""
import logging
import math
import re
from typing import Dict, List, Optional

import db
import llm
from config import Config

log = logging.getLogger(__name__)

_reranker = None
RRF_K = 60


def _get_reranker():
    global _reranker
    if _reranker is None:
        from sentence_transformers import CrossEncoder
        log.info("Loading reranker %s", Config.RERANK_MODEL)
        _reranker = CrossEncoder(Config.RERANK_MODEL, max_length=512)
    return _reranker


def _tsquery(query: str) -> str:
    """Natural language -> 'a | b | c' (OR semantics; Postgres drops stopwords)."""
    words = {w for w in re.findall(r"[a-z0-9]+", query.lower()) if len(w) > 1}
    return " | ".join(sorted(words))


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _fuse(vector: List[Dict], keyword: List[Dict]) -> List[Dict]:
    """Reciprocal rank fusion of two ranked lists."""
    fused: Dict[int, Dict] = {}
    for hits in (vector, keyword):
        for rank, h in enumerate(hits):
            entry = fused.setdefault(h["id"], {**h, "rrf": 0.0})
            entry["rrf"] += 1.0 / (RRF_K + rank + 1)
    out = sorted(fused.values(), key=lambda h: h["rrf"], reverse=True)
    for h in out:
        h["score"] = h["rrf"]
    return out


def retrieve(query: str, title: Optional[str] = None, mode: str = "full",
             k: int = Config.TOP_K) -> List[Dict]:
    """Return up to k hits, best first. Each hit has `score` (higher = more relevant).

    mode: 'dense' (cosine similarity), 'hybrid' (RRF score), 'full' (reranker probability 0-1).
    """
    vec = db.search(llm.embed_query(query), Config.N_VECTOR if mode != "dense" else k, title)
    if mode == "dense":
        return vec[:k]

    keyword = db.search_text(_tsquery(query), Config.N_KEYWORD, title)
    fused = _fuse(vec, keyword)
    if mode == "hybrid":
        return fused[:k]

    candidates = fused[:Config.N_RERANK]
    if not candidates:
        return []
    scores = _get_reranker().predict([(query, c["content"]) for c in candidates], batch_size=16)
    for c, s in zip(candidates, scores):
        s = float(s)
        c["score"] = s if 0.0 <= s <= 1.0 else _sigmoid(s)
    candidates.sort(key=lambda h: h["score"], reverse=True)
    return candidates[:k]


def looks_off_topic(hits: List[Dict]) -> bool:
    """Coarse, free pre-check: True only when the question is clearly unrelated to the papers.

    Requires BOTH a very low reranker score and low vector similarity. Anything ambiguous goes
    to the LLM, which judges whether the excerpts actually answer the question.
    """
    if not hits:
        return True
    best_rerank = max(h["score"] for h in hits)
    best_sim = max((h.get("sim") or 0.0) for h in hits)
    return best_rerank < Config.OFF_TOPIC_RERANK and best_sim < Config.OFF_TOPIC_SIM


def expand(hits: List[Dict]) -> List[Dict]:
    """Attach `context`: each hit's text plus its previous and next chunk."""
    keys = {(h["paper_id"], h["chunk_idx"] + d) for h in hits for d in (-1, 0, 1)}
    chunks = db.get_neighbors(sorted(keys))
    for h in hits:
        parts = [chunks.get((h["paper_id"], h["chunk_idx"] + d)) for d in (-1, 0, 1)]
        h["context"] = "\n".join(p["content"] for p in parts if p)
    return hits
