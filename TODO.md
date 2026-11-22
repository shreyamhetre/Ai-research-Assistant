# Roadmap

Rule for every phase: secrets live only in `backend/.env` (gitignored). No keys, DB names or passwords in code, compose, docs or logs.

## Phase 1 - Foundation (done, tested)
- [x] Secrets hygiene, `.env.example`, pre-commit secret guard, generic API errors
- [x] pgvector in Docker, chunked storage, cited answers, JSON MCQs, map-reduce summaries
- [x] OpenAI chat; local Hugging Face BGE embeddings
- [x] Editorial UI (black / orange / beige), top nav, hash routes
- [x] Retrieval work: evaluation set, sentence-aware chunking + cleanup, hybrid search, reranker (bge-reranker-base)
- [x] Off-topic handling: free pre-check + LLM relevance judgement (score cut-offs proved unreliable)

## Phase 2 - Differentiator (code written, NOT yet tested)
- [x] CrewAI comparison crew (researcher agent per paper + critic), structured output
- [x] Compare page: verdict per point, stance per paper, page links
- [x] Click a citation or source to open the stored PDF at that page
- [ ] Test `/compare` end to end (needs a Python 3.12 venv for CrewAI)

## Phase 3 - Polish (code written, NOT yet tested)
- [x] Chat memory (last 6 messages; short follow-ups borrow the previous question for retrieval)
- [x] Summaries cached per paper, Regenerate forces a fresh one
- [x] Library: delete paper, open PDF
- [x] Spaced-repetition quiz: cards saved from every quiz, Leitner schedule, Review mode
- [x] pytest suite and GitHub Actions CI (written, not yet run)
- [x] Dockerfiles; `docker compose up -d --build` runs db + backend + frontend
- [x] Flask debug off by default

## Next
- [ ] Run the pytest suite and the retrieval eval after the answer-flow changes
- [ ] Re-ingest existing papers (chunking changed) and re-tune `OFF_TOPIC_*` thresholds
- [ ] Try `bge-reranker-v2-m3` against `bge-reranker-base` using the eval set
- [ ] Query rewriting (one cheap LLM call) if vague questions still retrieve poorly
- [ ] Async job + progress for `/compare` (currently one long request)
