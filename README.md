# AI Research Assistant

Upload research papers (PDF), then ask questions with cited answers, compare papers, read summaries and quiz yourself. Retrieval-augmented generation over your own library.

## Features
- **Study Assistant** (CrewAI agent): one chat where you ask a doubt, request a summary, take an MCQ quiz, or compare papers, about one paper or several. The agent picks the right tool (search papers, summarise, generate quiz, review due questions), cites numbered sources, and shows summaries and quizzes as cards in the chat. Click a citation to open the PDF at that page.
- **Retrieval**: hybrid search (vector + keyword) reranked by a local cross-encoder; follow-up questions use the conversation; off-topic questions are answered from general knowledge and labelled as such.
- **Summaries**: structured overview (map-reduce for long papers), cached per paper, with its own fast tab (no agent).
- **Quizzes**: generated questions are saved as spaced-repetition cards (Leitner boxes); missed ones return soon, known ones later. Ask the assistant to review what is due.
- **Library**: drag-and-drop upload, validation, open or delete papers.

## Stack
- **Frontend**: React, Material UI
- **Backend**: Flask
- **Database**: PostgreSQL + pgvector
- **Embeddings / reranking**: open-source Hugging Face `BAAI/bge-base-en-v1.5` and `BAAI/bge-reranker-base`, run locally
- **LLM**: OpenAI chat model (configurable)
- **Agent**: CrewAI, used by the Study Assistant only; the Summaries tab and the retrieval pipeline are plain Python

## Retrieval pipeline
Papers are cleaned (headers, footers, hyphenation) and split into ~900-character sentence-aligned chunks. A query runs vector search and Postgres full-text search, merges them with reciprocal rank fusion, reranks the top 20 with the cross-encoder, and expands each hit with its neighbouring chunks. The LLM then decides whether the excerpts really answer the question.

## Setup

Prerequisites: Docker, Node 18+, Python 3.12. CrewAI needs Python 3.10 to 3.13; on 3.14 the Study Assistant falls back to plain RAG for questions (no summaries or quizzes in chat), and everything else works.

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
| POST | `/assistant` | `{message, titles?, history?}` runs the CrewAI Study Assistant; returns reply, sources, quiz, summary, tools used |
| GET | `/health` | liveness |

## Changing models
The vector size in `db/init.sql` (`vector(768)`) must match `EMBED_MODEL`. For another embedding model, change both and recreate the DB volume (`docker compose down -v`). `RERANK_MODEL` can be swapped freely.

## Roadmap
See [TODO.md](TODO.md).
