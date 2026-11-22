"""PostgreSQL / pgvector access. Schema lives in ../db/init.sql."""
import logging
from contextlib import contextmanager
from typing import Dict, List, Optional, Tuple

import psycopg2
from psycopg2.pool import ThreadedConnectionPool

from config import Config

log = logging.getLogger(__name__)

_pool: Optional[ThreadedConnectionPool] = None


def _get_pool() -> ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = ThreadedConnectionPool(
            1, 10,
            dbname=Config.PG_DATABASE, user=Config.PG_USER,
            password=Config.PG_PASSWORD, host=Config.PG_HOST, port=Config.PG_PORT,
        )
    return _pool


@contextmanager
def cursor():
    pool = _get_pool()
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def _vec(embedding: List[float]) -> str:
    return "[" + ",".join(map(str, embedding)) + "]"


class DuplicateTitle(Exception):
    pass


def store_paper(title: str, file_bytes: bytes,
                chunks: List[Tuple[int, str, List[float]]]) -> int:
    """chunks: (page, text, embedding). Returns paper id."""
    try:
        with cursor() as cur:
            cur.execute(
                "INSERT INTO papers (title, file) VALUES (%s, %s) RETURNING id",
                (title, psycopg2.Binary(file_bytes)),
            )
            paper_id = cur.fetchone()[0]
            for idx, (page, text, emb) in enumerate(chunks):
                cur.execute(
                    "INSERT INTO chunks (paper_id, chunk_idx, page, content, embedding) "
                    "VALUES (%s, %s, %s, %s, %s)",
                    (paper_id, idx, page, text, _vec(emb)),
                )
            return paper_id
    except psycopg2.errors.UniqueViolation:
        raise DuplicateTitle(title)


def list_titles() -> List[str]:
    with cursor() as cur:
        cur.execute("SELECT title FROM papers ORDER BY created_at DESC")
        return [r[0] for r in cur.fetchall()]


def list_papers() -> List[Dict]:
    with cursor() as cur:
        cur.execute(
            "SELECT p.title, p.created_at, COUNT(c.id), COALESCE(MAX(c.page), 0) "
            "FROM papers p LEFT JOIN chunks c ON c.paper_id = p.id "
            "GROUP BY p.id ORDER BY p.created_at DESC"
        )
        return [{"title": r[0], "created_at": r[1].isoformat(), "chunks": r[2], "pages": r[3]}
                for r in cur.fetchall()]


def get_paper_text(title: str) -> Optional[str]:
    with cursor() as cur:
        cur.execute(
            "SELECT c.content FROM chunks c JOIN papers p ON p.id = c.paper_id "
            "WHERE p.title = %s ORDER BY c.chunk_idx",
            (title,),
        )
        rows = cur.fetchall()
    return "\n".join(r[0] for r in rows) if rows else None


def _row_to_hit(r) -> Dict:
    return {"id": r[0], "paper_id": r[1], "title": r[2], "page": r[3], "chunk_idx": r[4],
            "content": r[5], "score": float(r[6])}


def search(embedding: List[float], k: int, title: Optional[str] = None) -> List[Dict]:
    """Vector search. score = cosine similarity (higher is better)."""
    sql = (
        "SELECT c.id, c.paper_id, p.title, c.page, c.chunk_idx, c.content, "
        "1 - (c.embedding <=> %s::vector) AS score "
        "FROM chunks c JOIN papers p ON p.id = c.paper_id "
    )
    params: list = [_vec(embedding)]
    if title:
        sql += "WHERE p.title = %s "
        params.append(title)
    sql += "ORDER BY c.embedding <=> %s::vector LIMIT %s"
    params += [_vec(embedding), k]
    with cursor() as cur:
        cur.execute(sql, params)
        hits = [_row_to_hit(r) for r in cur.fetchall()]
    for h in hits:
        h["sim"] = h["score"]  # cosine similarity, kept through fusion and reranking
    return hits


def search_text(tsquery: str, k: int, title: Optional[str] = None) -> List[Dict]:
    """Full-text search. `tsquery` must be a sanitised 'a | b | c' string. score = ts_rank_cd."""
    if not tsquery:
        return []
    sql = (
        "SELECT c.id, c.paper_id, p.title, c.page, c.chunk_idx, c.content, "
        "ts_rank_cd(c.tsv, to_tsquery('english', %s)) AS score "
        "FROM chunks c JOIN papers p ON p.id = c.paper_id "
        "WHERE c.tsv @@ to_tsquery('english', %s) "
    )
    params: list = [tsquery, tsquery]
    if title:
        sql += "AND p.title = %s "
        params.append(title)
    sql += "ORDER BY score DESC LIMIT %s"
    params.append(k)
    with cursor() as cur:
        cur.execute(sql, params)
        return [_row_to_hit(r) for r in cur.fetchall()]


def get_neighbors(keys: List[Tuple[int, int]]) -> Dict[Tuple[int, int], Dict]:
    """Fetch chunks by (paper_id, chunk_idx). Returns {(paper_id, chunk_idx): {page, content}}."""
    if not keys:
        return {}
    with cursor() as cur:
        cur.execute(
            "SELECT paper_id, chunk_idx, page, content FROM chunks "
            "WHERE (paper_id, chunk_idx) IN %s",
            (tuple(keys),),
        )
        return {(r[0], r[1]): {"page": r[2], "content": r[3]} for r in cur.fetchall()}


def delete_paper(title: str) -> bool:
    with cursor() as cur:
        cur.execute("DELETE FROM papers WHERE title = %s", (title,))
        return cur.rowcount > 0
