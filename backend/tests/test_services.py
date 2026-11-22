import services

HIT = {"score": 0.5, "sim": 0.7, "title": "Paper A", "page": 3, "content": "alpha beta",
       "paper_id": 1, "chunk_idx": 0}


def patch_retrieval(monkeypatch, hits, seen=None):
    def fake_retrieve(query, title=None, mode="full", k=5):
        if seen is not None:
            seen.append(query)
        return hits

    monkeypatch.setattr(services.retrieval, "retrieve", fake_retrieve)
    monkeypatch.setattr(services.retrieval, "expand",
                        lambda hs: [{**h, "context": h["content"]} for h in hs])


def test_off_topic_question_skips_the_papers(monkeypatch):
    patch_retrieval(monkeypatch, [{"score": 0.0, "sim": 0.1, **{k: HIT[k] for k in ("title", "page", "content")}}])
    monkeypatch.setattr(services.llm, "chat", lambda s, u, **k: "general answer")
    result = services.answer("capital of France?")
    assert result == {"response": "general answer", "sources": [], "grounded": False}


def test_grounded_answer_returns_sources(monkeypatch):
    patch_retrieval(monkeypatch, [HIT])
    monkeypatch.setattr(services.llm, "chat_json", lambda s, u, **k: {"grounded": True, "answer": "yes [1]"})
    result = services.answer("what is alpha?")
    assert result["grounded"] is True
    assert result["sources"] == [{"id": 1, "title": "Paper A", "page": 3, "snippet": "alpha beta"}]


def test_llm_can_reject_the_excerpts(monkeypatch):
    patch_retrieval(monkeypatch, [HIT])
    monkeypatch.setattr(services.llm, "chat_json", lambda s, u, **k: {"grounded": False, "answer": "not in papers"})
    result = services.answer("explain gradient descent")
    assert result["grounded"] is False and result["sources"] == []


def test_empty_llm_answer_falls_back_to_general(monkeypatch):
    patch_retrieval(monkeypatch, [HIT])
    monkeypatch.setattr(services.llm, "chat_json", lambda s, u, **k: {"grounded": True, "answer": ""})
    monkeypatch.setattr(services.llm, "chat", lambda s, u, **k: "fallback")
    assert services.answer("q?")["response"] == "fallback"


def test_short_follow_up_borrows_previous_question(monkeypatch):
    seen = []
    patch_retrieval(monkeypatch, [], seen)
    monkeypatch.setattr(services.llm, "chat", lambda s, u, **k: "x")
    history = [{"role": "user", "content": "What is indexing?"}, {"role": "assistant", "content": "a"}]
    services.answer("and why?", history=history)
    assert seen == ["What is indexing? and why?"]


def test_long_question_is_not_rewritten(monkeypatch):
    seen = []
    patch_retrieval(monkeypatch, [], seen)
    monkeypatch.setattr(services.llm, "chat", lambda s, u, **k: "x")
    q = "Please explain in detail how the paper defines the notion of intelligence"
    services.answer(q, history=[{"role": "user", "content": "earlier"}])
    assert seen == [q]


def test_history_is_cleaned_and_limited():
    history = [{"role": "user", "content": "x" * 5000}] * 20 + [{"role": "system", "content": "no"}, {"bad": 1}]
    cleaned = services._clean_history(history)
    assert len(cleaned) <= services.Config.HISTORY_MESSAGES
    assert all(m["role"] in ("user", "assistant") and len(m["content"]) <= services.HISTORY_CHARS for m in cleaned)


def test_mcq_validation_drops_malformed_questions(monkeypatch):
    good = {"question": "Q?", "options": ["a", "b", "c", "d"], "answer_index": 2, "explanation": "because"}
    bad_options = {"question": "Q2?", "options": ["a", "b", "c"], "answer_index": 0}
    bad_index = {"question": "Q3?", "options": ["a", "b", "c", "d"], "answer_index": 9}
    monkeypatch.setattr(services, "_paper_text", lambda t: "text")
    monkeypatch.setattr(services.llm, "chat_json", lambda s, u, **k: {"questions": [good, bad_options, bad_index]})
    monkeypatch.setattr(services.db_extra, "save_cards", lambda title, qs: qs)
    assert services.make_mcqs("T") == [good]


def test_summary_is_served_from_cache(monkeypatch):
    monkeypatch.setattr(services.db_extra, "get_artifact", lambda t, k: "cached text")
    assert services.summarize("T") == ("cached text", True)


def test_refresh_regenerates_and_stores(monkeypatch):
    stored = {}
    monkeypatch.setattr(services.db_extra, "get_artifact", lambda t, k: "old")
    monkeypatch.setattr(services.db_extra, "set_artifact", lambda t, k, c: stored.update({k: c}))
    monkeypatch.setattr(services, "_paper_text", lambda t: "short paper")
    monkeypatch.setattr(services.llm, "chat", lambda s, u, **k: "new summary")
    assert services.summarize("T", refresh=True) == ("new summary", False)
    assert stored == {"summary": "new summary"}
