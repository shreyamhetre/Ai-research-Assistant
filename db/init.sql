CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS papers (
    id         SERIAL PRIMARY KEY,
    title      TEXT UNIQUE NOT NULL,
    file       BYTEA,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 768 dims = BAAI/bge-base-en-v1.5 (must match EMBED_MODEL)
CREATE TABLE IF NOT EXISTS chunks (
    id        SERIAL PRIMARY KEY,
    paper_id  INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    chunk_idx INTEGER NOT NULL,
    page      INTEGER,
    content   TEXT NOT NULL,
    embedding vector(768) NOT NULL
);

CREATE INDEX IF NOT EXISTS chunks_paper_idx ON chunks (paper_id);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
    ON chunks USING hnsw (embedding vector_cosine_ops);

-- Keyword search (hybrid retrieval)
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
CREATE INDEX IF NOT EXISTS chunks_tsv_idx ON chunks USING gin (tsv);

-- Cached summaries
CREATE TABLE IF NOT EXISTS artifacts (
    paper_id   INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (paper_id, kind)
);

-- Spaced-repetition quiz cards (Leitner boxes)
CREATE TABLE IF NOT EXISTS cards (
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
);
CREATE INDEX IF NOT EXISTS cards_due_idx ON cards (due_at);
