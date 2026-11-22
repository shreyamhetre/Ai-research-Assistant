"""Schema bootstrap plus the smaller features: cached summaries, spaced-repetition cards, PDFs."""
import json
from typing import Dict, List, Optional

from db import cursor

# Idempotent DDL: brings an existing database up to date. Mirrored in db/init.sql for fresh ones.
SCHEMA = [
    """ALTER TABLE chunks ADD COLUMN IF NOT EXISTS tsv tsvector
       GENERATED ALWAYS AS (to_tsvector('english', content)) STORED""",
    "CREATE INDEX IF NOT EXISTS chunks_tsv_idx ON chunks USING gin (tsv)",
    """CREATE TABLE IF NOT EXISTS artifacts (
           paper_id   INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
           kind       TEXT NOT NULL,
           content    TEXT NOT NULL,
           created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
           PRIMARY KEY (paper_id, kind)
       )""",
    """CREATE TABLE IF NOT EXISTS cards (
           id           SERIAL PRIMARY KEY,
           paper_id     INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
           question     TEXT NOT NULL,
           options      TEXT NOT NULL,
           answer_index INTEGER NOT NULL,
           explanation  TEXT NOT NULL DEFAULT '',
           box          INTEGER NOT NULL DEFAULT 1,
           due_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
           created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
           UNIQUE (paper_id, question)
       )""",
    "CREATE INDEX IF NOT EXISTS cards_due_idx ON cards (due_at)",
]


def ensure_schema() -> None:
    with cursor() as cur:
        for stmt in SCHEMA:
            cur.execute(stmt)


def _paper_id(cur, title: str) -> Optional[int]:
    cur.execute("SELECT id FROM papers WHERE title = %s", (title,))
    row = cur.fetchone()
    return row[0] if row else None


# ------------------------------------------------------------------ original PDF
def get_paper_file(title: str) -> Optional[bytes]:
    with cursor() as cur:
        cur.execute("SELECT file FROM papers WHERE title = %s", (title,))
        row = cur.fetchone()
    return bytes(row[0]) if row and row[0] is not None else None


# ------------------------------------------------------------------ cached summaries
def get_artifact(title: str, kind: str) -> Optional[str]:
    with cursor() as cur:
        cur.execute(
            "SELECT a.content FROM artifacts a JOIN papers p ON p.id = a.paper_id "
            "WHERE p.title = %s AND a.kind = %s", (title, kind))
        row = cur.fetchone()
    return row[0] if row else None


def set_artifact(title: str, kind: str, content: str) -> None:
    with cursor() as cur:
        pid = _paper_id(cur, title)
        if pid is None:
            return
        cur.execute(
            "INSERT INTO artifacts (paper_id, kind, content) VALUES (%s, %s, %s) "
            "ON CONFLICT (paper_id, kind) DO UPDATE SET content = EXCLUDED.content, created_at = now()",
            (pid, kind, content))


# ------------------------------------------------------------------ spaced-repetition cards
# Leitner boxes: days until a card is due again after a correct answer that lands in the box.
BOX_DAYS = {1: 1, 2: 2, 3: 4, 4: 8, 5: 16}


def save_cards(title: str, questions: List[Dict]) -> List[Dict]:
    """Store generated questions as cards (deduplicated by question text). Returns them with ids."""
    out: List[Dict] = []
    with cursor() as cur:
        pid = _paper_id(cur, title)
        if pid is None:
            return questions
        for q in questions:
            cur.execute(
                "INSERT INTO cards (paper_id, question, options, answer_index, explanation) "
                "VALUES (%s, %s, %s, %s, %s) "
                "ON CONFLICT (paper_id, question) DO UPDATE SET question = EXCLUDED.question "
                "RETURNING id",
                (pid, q["question"], json.dumps(q["options"]), q["answer_index"], q.get("explanation", "")))
            out.append({**q, "id": cur.fetchone()[0]})
    return out


def _card(r) -> Dict:
    return {"id": r[0], "question": r[1], "options": json.loads(r[2]), "answer_index": r[3],
            "explanation": r[4], "box": r[5], "paper": r[6]}


def due_cards(title: Optional[str], limit: int = 10) -> Dict:
    """Cards due now (oldest first) plus the total number of saved cards in scope."""
    where, params = "c.due_at <= now()", []
    if title:
        where += " AND p.title = %s"
        params.append(title)
    with cursor() as cur:
        cur.execute(
            "SELECT c.id, c.question, c.options, c.answer_index, c.explanation, c.box, p.title "
            "FROM cards c JOIN papers p ON p.id = c.paper_id "
            f"WHERE {where} ORDER BY c.due_at LIMIT %s", params + [limit])
        cards = [_card(r) for r in cur.fetchall()]
        cur.execute(
            "SELECT COUNT(*) FROM cards c JOIN papers p ON p.id = c.paper_id"
            + (" WHERE p.title = %s" if title else ""), [title] if title else [])
        total = cur.fetchone()[0]
    return {"cards": cards, "total": total}


def review_card(card_id: int, correct: bool) -> Optional[Dict]:
    """Correct: move up one box (due later). Wrong: back to box 1 (due now)."""
    with cursor() as cur:
        cur.execute("SELECT box FROM cards WHERE id = %s", (card_id,))
        row = cur.fetchone()
        if not row:
            return None
        box = min(row[0] + 1, 5) if correct else 1
        days = BOX_DAYS[box] if correct else 0
        cur.execute(
            "UPDATE cards SET box = %s, due_at = now() + (%s * interval '1 day') WHERE id = %s",
            (box, days, card_id))
    return {"id": card_id, "box": box, "due_in_days": days}
