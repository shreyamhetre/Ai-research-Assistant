# AI Research Assistant

Upload research papers (PDF), then ask questions with cited answers, get structured summaries, and quiz yourself. Retrieval-augmented generation over your own library.

## Features
- **Cited Q&A**: answers are grounded in retrieved passages, with paper and page references. Optionally restrict a question to one paper. Falls back to general knowledge, clearly labelled, when your papers have nothing relevant.
- **Summaries**: structured overview (map-reduce for long papers).
- **Quiz**: multiple-choice questions generated as structured JSON, with scoring and explanations.
- **Library**: drag-and-drop PDF upload with validation (PDF only, size limit, unique titles).

## Stack
- **Frontend**: React, Material UI
- **Backend**: Flask
- **Database**: PostgreSQL + pgvector (Docker)
- **Embeddings**: open-source Hugging Face `BAAI/bge-base-en-v1.5`, run locally
- **LLM**: OpenAI chat model (configurable)

Papers are split into overlapping chunks; each chunk is embedded and stored, and queries retrieve the nearest chunks by cosine distance.

## Setup

Prerequisites: Docker, Node 18+, Python 3.11+.

1. **Configure secrets**. Copy `backend/.env.example` to `backend/.env` and fill in your own values. `.env` is gitignored; never commit it.
2. **Start the database** (creates the tables from `db/init.sql`):
   ```bash
   docker compose --env-file backend/.env up -d
   ```
3. **Backend**:
   ```bash
   cd backend
   python -m venv .venv
   .venv/Scripts/activate        # Windows; use source .venv/bin/activate elsewhere
   pip install -r requirements.txt
   python app.py                 # http://localhost:5000
   ```
   The first run downloads the embedding model.
4. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm start                     # http://localhost:3000
   ```
   Set `REACT_APP_API_URL` if the backend is not on `http://localhost:5000`.

## API
| Method | Path | Purpose |
|---|---|---|
| POST | `/upload` | multipart `file` + `title` |
| GET | `/fetch-titles` | list papers |
| POST | `/chatbot` | `{query, title?}` returns answer + sources |
| POST | `/summary` | `{title}` |
| POST | `/createMcq` | `{title}` |
| GET | `/health` | liveness |

## Changing the embedding model
The vector size in `db/init.sql` (`vector(768)`) must match the model. For another model, change `EMBED_MODEL` and the vector size, then recreate the DB volume (`docker compose down -v`).

## Roadmap
See [TODO.md](TODO.md).
