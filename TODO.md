# Roadmap

Rule for every phase: secrets live only in `backend/.env` (gitignored). No keys, DB names or passwords in code, compose, docs or logs. No pushing until agreed.

## Phase 1 - Foundation
- [x] Secrets hygiene: `.env` / `__pycache__` untracked, `.gitignore`, `.env.example` (placeholders), no config defaults, pre-commit secret guard
- [x] pgvector in Docker with `papers` + `chunks` tables (`db/init.sql`)
- [x] OpenAI for chat; local Hugging Face BGE for embeddings
- [x] Chunked storage, cited answers, JSON MCQs, map-reduce summaries, upload validation
- [x] Generic API errors (no raw provider errors to clients)
- [x] Professional UI (theme, sidebar, drag-and-drop upload, markdown answers, quiz scoring)
- [x] README rewritten
- [x] Tested without key: DB, chunking, embeddings, vector search, upload + validation, duplicates
- [ ] Tested with key: chat, summary, quiz (needs OPENAI_API_KEY in backend/.env)
- [ ] Tune `MAX_DISTANCE` on a real paper (BGE distances are tight; tiny test docs can't tell)
- [ ] Review the UI in the browser together
- [ ] Turn off Flask `debug=True` outside local dev

## Phase 2 - Differentiator (CrewAI)
- [ ] Add CrewAI (OpenAI LLM, our retrieval as a tool)
- [ ] Cross-paper contradiction / consensus finder: retriever, per-paper claim extractor, critic, writer agents
- [ ] Comparison UI: agree / disagree / not mentioned, with citations
- [ ] Click a citation to open the stored PDF at that page

## Phase 3 - Polish
- [ ] Conversation memory in chat
- [ ] Cache summaries / quizzes per paper
- [ ] Paper library: delete, details
- [ ] Spaced-repetition quiz mode
- [ ] Tests (pytest) and CI
- [ ] Dockerfiles; one-command `docker compose up`
