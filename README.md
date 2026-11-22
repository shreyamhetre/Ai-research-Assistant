# AI Research Assistant

Upload research papers (PDF), then ask questions with cited answers, compare papers, read summaries and quiz yourself. Retrieval-augmented generation over your own library.

## Features
- **Cited Q&A**: hybrid retrieval (vector + keyword) reranked by a local cross-encoder. Answers cite numbered sources; click a citation to open the PDF at that page. Follow-up questions use the conversation. Off-topic questions are answered from general knowledge and labelled as such.
- **Compare**: a CrewAI crew (one researcher agent per paper plus a critic) shows where the selected papers agree or contradict, with page citations.
- **Summaries**: structured overview (map-reduce for long papers), cached per paper.
- **Quiz**: generated multiple-choice questions, saved as spaced-repetition cards (Leitner boxes). Review what is due without any API calls.
- **Library**: drag-and-drop upload, validation, open or delete papers.

## Stack
- **Frontend**: React, Material UI
- **Backend**: Flask
- **Database**: PostgreSQL + pgvector
- **Embeddings / reranking**: open-source Hugging Face `BAAI/bge-base-en-v1.5` and `BAAI/bge-reranker-base`, run locally
- **LLM**: OpenAI chat model (configurable)
- **Agents**: CrewAI (comparison only; the rest is plain RAG)

## Retrieval pipeline
Papers are cleaned (headers, footers, hyphenation) and split into ~900-character sentence-aligned chunks. A query runs vector search and Postgres full-text search, merges them with reciprocal rank fusion, reranks the top 20 with the cross-encoder, and expands each hit with its neighbouring chunks. The LLM then decides whether the excerpts really answer the question.

## Setup

Prerequisites: Docker, Node 18+, Python 3.12 (CrewAI needs 3.10 to 3.13; without it everything works except Compare).

1. **Configure secrets.** Copy `backend/.env.example` to `backend/.env` and fill in your own values. `.env` is gitignored; never commit it.
2. **Everything in Docker:**
   ```bash
   docker compose --env-file backend/.env up -d --build
   ```
   Open http://localhost:3000. The first request downloads the models (cached in a volume).

   **Or run the app locally** and only the database in Docker:
   ```bash
   docker compose --env-file backend/.env up -d db

   cd backend
   py -3.12 -m venv .venv                 # or: python3.12 -m venv .venv
   .venv/Scripts/activate                 # Windows; use source .venv/bin/activate elsewhere
   pip install -r requirements.txt
   python app.py                          # http://localhost:5000

   cd frontend
   npm install
   npm start                              # http://localhost:3000
   ```
   Set `REACT_APP_API_URL` if the backend is not on `http://localhost:5000`. Set `FLASK_DEBUG=1` for Flask's debug mode (off by default). Existing databases are migrated automatically on the first request.

## Tests and evaluation
```bash
cd backend
pip install -r requirements-dev.txt
pytest                                    # unit and API tests; no DB, models or API key needed

python -m eval.run_eval --modes dense,hybrid,full        # retrieval quality on a real paper, no API cost
python -m eval.run_eval --pdf paper.pdf --reingest       # rebuild the paper's chunks first
```
`backend/eval/questions.json` holds the questions and the phrase each correct passage must contain. Edit `title` and the questions to evaluate your own paper.

## API
| Method | Path | Purpose |
|---|---|---|
| POST | `/upload` | multipart `file` + `title` |
| GET | `/papers` | list papers (date, pages, passages) |
| DELETE | `/papers?title=` | delete a paper and everything derived from it |
| GET | `/paper-file?title=` | the original PDF (append `#page=N`) |
| POST | `/chatbot` | `{query, title?, history?}` returns answer, sources, grounded |
| POST | `/summary` | `{title, refresh?}` returns summary, cached |
| POST | `/createMcq` | `{title}` returns questions saved as cards |
| GET | `/review/due?title=` | cards due for review |
| POST | `/review` | `{id, correct}` reschedules a card |
| POST | `/compare` | `{titles, topic}` runs the CrewAI comparison |
| GET | `/health` | liveness |

## Changing models
The vector size in `db/init.sql` (`vector(768)`) must match `EMBED_MODEL`. For another embedding model, change both and recreate the DB volume (`docker compose down -v`). `RERANK_MODEL` can be swapped freely.

## Roadmap
See [TODO.md](TODO.md).
