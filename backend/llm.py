"""Embeddings (local Hugging Face BGE) and chat (OpenAI)."""
import json
import logging
from typing import List

from openai import OpenAI

from config import Config

log = logging.getLogger(__name__)

_client = None
_embedder = None

# BGE retrieval models expect this prefix on queries (not on documents).
BGE_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


def client() -> OpenAI:
    global _client
    if _client is None:
        if not Config.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is not set (see backend/.env.example)")
        _client = OpenAI(api_key=Config.OPENAI_API_KEY, timeout=60)
    return _client


def _embedder_model():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        log.info("Loading embedding model %s", Config.EMBED_MODEL)
        _embedder = SentenceTransformer(Config.EMBED_MODEL)
    return _embedder


def embed_documents(texts: List[str]) -> List[List[float]]:
    vecs = _embedder_model().encode(texts, batch_size=32, normalize_embeddings=True)
    return vecs.tolist()


def embed_query(text: str) -> List[float]:
    vec = _embedder_model().encode(BGE_QUERY_PREFIX + text, normalize_embeddings=True)
    return vec.tolist()


def chat(system: str, user: str, temperature: float = 0.2) -> str:
    resp = client().chat.completions.create(
        model=Config.CHAT_MODEL,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return (resp.choices[0].message.content or "").strip()


def chat_json(system: str, user: str, temperature: float = 0.4) -> dict:
    resp = client().chat.completions.create(
        model=Config.CHAT_MODEL,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return json.loads(resp.choices[0].message.content or "{}")
