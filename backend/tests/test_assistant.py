"""The agent's tools are plain functions: tests call them directly with CrewAI's decorator faked."""
import pytest

import assistant

KNOWN = ["What Is AI Anyway (Schank)", "Attention Is All You Need"]
HIT = {"id": 11, "title": KNOWN[0], "page": 4, "content": "alpha beta", "context": "ctx alpha beta",
       "score": 0.4, "sim": 0.7, "paper_id": 1, "chunk_idx": 3}


def fake_tool(name):
    return lambda fn: fn


def make(scope=None, known=KNOWN):
    state = assistant.RunState(scope=scope or [])
    return state, assistant.build_tools(state, known, fake_tool)


@pytest.fixture()
def hits(monkeypatch):
    monkeypatch.setattr(assistant.retrieval, "retrieve", lambda q, t=None, mode="full", k=4: [dict(HIT)])
    monkeypatch.setattr(assistant.retrieval, "expand", lambda hs: hs)
    monkeypatch.setattr(assistant.retrieval, "looks_off_topic", lambda hs: False)


def test_citation_numbers_are_stable_and_deduplicated():
    state = assistant.RunState()
    assert state.cite(HIT) == 1
    assert state.cite({**HIT, "id": 12}) == 2
    assert state.cite(HIT) == 1
    assert [s["id"] for s in state.sources] == [1, 2]


def test_search_returns_numbered_passages_and_records_sources(hits):
    state, tools = make()
    out = tools["search_papers"]("what is alpha", "")
    assert out.startswith("[1] (What Is AI Anyway (Schank), p.4)") and "ctx alpha beta" in out
    tools["search_papers"]("again", "")
    assert len(state.sources) == 1                      # same chunk, same citation
    assert state.tools_used == ["search_papers"]


def test_search_passes_scope_or_named_paper(monkeypatch):
    targets = []

    def fake_retrieve(q, t=None, mode="full", k=4):
        targets.append(t)
        return [dict(HIT)]

    monkeypatch.setattr(assistant.retrieval, "retrieve", fake_retrieve)
    monkeypatch.setattr(assistant.retrieval, "expand", lambda hs: hs)
    monkeypatch.setattr(assistant.retrieval, "looks_off_topic", lambda hs: False)
    _, tools = make(scope=KNOWN)
    tools["search_papers"]("q", "")
    tools["search_papers"]("q", "attention")              # unique substring resolves to the title
    assert targets == [KNOWN, KNOWN[1]]


def test_search_off_topic_has_no_sources(monkeypatch):
    monkeypatch.setattr(assistant.retrieval, "retrieve", lambda *a, **k: [dict(HIT)])
    monkeypatch.setattr(assistant.retrieval, "looks_off_topic", lambda hs: True)
    state, tools = make()
    assert "No relevant passages" in tools["search_papers"]("capital of France", "")
    assert state.sources == []


def test_unknown_paper_lists_available_titles():
    _, tools = make()
    out = tools["search_papers"]("q", "nonexistent")
    assert "Unknown paper" in out and KNOWN[0] in out


def test_summary_defaults_to_the_only_selected_paper(monkeypatch):
    monkeypatch.setattr(assistant.services, "summarize", lambda title: ("the summary", True))
    state, tools = make(scope=[KNOWN[0]])
    out = tools["summarize_paper"]("")
    assert state.summary == {"title": KNOWN[0], "text": "the summary"}
    assert "already displayed" in out


def test_summary_needs_a_paper_when_ambiguous():
    state, tools = make(scope=KNOWN)
    assert "Say which paper" in tools["summarize_paper"]("")
    assert state.summary is None


def test_quiz_is_captured_for_the_ui(monkeypatch):
    questions = [{"id": 1, "question": "Q?", "options": list("abcd"), "answer_index": 0, "explanation": ""}]
    monkeypatch.setattr(assistant.services, "make_mcqs", lambda title: questions)
    state, tools = make(known=[KNOWN[0]])
    out = tools["generate_quiz"]("")
    assert state.quiz == questions and "do not list" in out


def test_review_reports_when_nothing_is_due(monkeypatch):
    monkeypatch.setattr(assistant.db_extra, "due_cards", lambda title, limit=5: {"cards": [], "total": 3})
    state, tools = make()
    assert "No questions are due" in tools["review_due_questions"]("")
    assert state.quiz == []


def test_review_brings_back_due_cards(monkeypatch):
    cards = [{"id": 5, "question": "Q?", "options": list("abcd"), "answer_index": 1, "explanation": ""}]
    monkeypatch.setattr(assistant.db_extra, "due_cards", lambda title, limit=5: {"cards": cards, "total": 1})
    state, tools = make()
    tools["review_due_questions"]("")
    assert state.quiz == cards


def test_falls_back_to_plain_rag_without_crewai(monkeypatch):
    monkeypatch.setattr(assistant.db, "list_titles", lambda: KNOWN)

    def missing():
        raise assistant.CrewUnavailable("no crewai")

    seen = {}

    def fake_answer(message, title, history):
        seen.update(title=title)
        return {"response": "plain", "sources": [], "grounded": False}

    monkeypatch.setattr(assistant, "_import_crewai", missing)
    monkeypatch.setattr(assistant.services, "answer", fake_answer)
    result = assistant.run("what is alpha?", [KNOWN[0]])
    assert result["agent"] is False and result["response"] == "plain"
    assert result["quiz"] is None and result["summary"] is None
    assert seen["title"] == KNOWN[0]                     # single selected paper scopes the fallback


def test_unknown_scope_titles_are_ignored(monkeypatch):
    monkeypatch.setattr(assistant.db, "list_titles", lambda: KNOWN)
    monkeypatch.setattr(assistant, "_import_crewai", lambda: (_ for _ in ()).throw(assistant.CrewUnavailable("x")))
    seen = {}
    monkeypatch.setattr(assistant.services, "answer",
                        lambda m, t, h: seen.update(title=t) or {"response": "r", "sources": [], "grounded": False})
    assistant.run("q", ["Not a paper"])
    assert seen["title"] is None
