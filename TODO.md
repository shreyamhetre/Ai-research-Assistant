# Roadmap

Rule for every phase: secrets live only in `backend/.env` (gitignored). No keys, DB names or passwords in code, compose, docs or logs.

## Phase 1 - Foundation (done, tested)
- [x] Secrets hygiene, `.env.example`, pre-commit secret guard, generic API errors
- [x] pgvector in Docker, chunked storage, cited answers, JSON MCQs, map-reduce summaries
- [x] OpenAI chat; local Hugging Face BGE embeddings
- [x] Editorial UI (black / orange / beige), top nav, hash routes
- [x] Retrieval work: evaluation set, sentence-aware chunking + cleanup, hybrid search, reranker (bge-reranker-base)
- [x] Off-topic handling: free pre-check + LLM relevance judgement (score cut-offs proved unreliable)

## Phase 2 - Study Assistant (CrewAI) - code written, NOT yet tested
- [x] One agent, four tools: search_papers, summarize_paper, generate_quiz, review_due_questions
- [x] Per-request side channel for citations, quiz and summary (UI never depends on the model formatting JSON)
- [x] Multi-paper scope (select papers or all); the agent searches per paper to compare
- [x] Plain-RAG fallback when CrewAI is not installed (Python 3.14)
- [x] Study Assistant tab: summary and quiz cards inline, tools-used caption, review prompt
- [x] Click a citation or source to open the stored PDF at that page
- [ ] Test the agent end to end (needs a Python 3.12 venv)

## Phase 3 - Polish - code written, NOT yet tested
- [x] Chat memory (last 6 messages; short follow-ups borrow the previous question for retrieval)
- [x] Summaries cached per paper, Regenerate forces a fresh one
- [x] Library: delete paper, open PDF
- [x] Spaced-repetition quiz cards (Leitner schedule)
- [x] pytest suite and GitHub Actions CI (written, not yet run)
- [x] Dockerfiles; `docker compose up -d --build` runs db + backend + frontend
- [x] Flask debug off by default

## Next (testing and tuning)
- [ ] Run pytest, then the retrieval eval, then the app end to end
- [ ] Re-tune `OFF_TOPIC_*` thresholds; try `bge-reranker-v2-m3` against `bge-reranker-base` with the eval set
- [ ] Measure agent latency and tokens per message; adjust `AGENT_MAX_ITER`
- [ ] Stream agent progress to the UI instead of one long request
