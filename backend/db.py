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


def search(embedding: List[float], k: int, title: Optional[str] = None) -> List[Dict]:
    sql = (
        "SELECT p.title, c.page, c.content, c.embedding <=> %s::vector AS dist "
        "FROM chunks c JOIN papers p ON p.id = c.paper_id "
    )
    params: list = [_vec(embedding)]
    if title:
        sql += "WHERE p.title = %s "
        params.append(title)
    sql += "ORDER BY dist LIMIT %s"
    params.append(k)
    with cursor() as cur:
        cur.execute(sql, params)
        return [
            {"title": r[0], "page": r[1], "content": r[2], "distance": float(r[3])}
            for r in cur.fetchall()
        ]
