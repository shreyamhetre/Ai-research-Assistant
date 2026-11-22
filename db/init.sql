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
