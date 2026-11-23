import io

import pytest

import app as app_module


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(app_module.db_extra, "ensure_schema", lambda: None)
    app_module.app.config["TESTING"] = True
    return app_module.app.test_client()


def upload(client, title="T", data=b"%PDF-1.4 test", name="a.pdf"):
    return client.post("/upload", data={"title": title, "file": (io.BytesIO(data), name)},
                       content_type="multipart/form-data")


def test_health(client):
    assert client.get("/health").get_json() == {"status": "ok"}


def test_upload_requires_title_and_file(client):
    assert client.post("/upload", data={"title": "T"}, content_type="multipart/form-data").status_code == 400


def test_upload_rejects_non_pdf(client):
    r = upload(client, data=b"hello")
    assert r.status_code == 400 and "PDF" in r.get_json()["error"]


def test_upload_duplicate_title_is_409(client, monkeypatch):
    def boom(title, data):
        raise app_module.db.DuplicateTitle(title)

    monkeypatch.setattr(app_module.services, "ingest", boom)
    assert upload(client).status_code == 409


def test_upload_success(client, monkeypatch):
    monkeypatch.setattr(app_module.services, "ingest", lambda title, data: 12)
    assert upload(client).get_json()["chunks"] == 12


def test_chatbot_requires_query(client):
    assert client.post("/chatbot", json={"query": "  "}).status_code == 400


def test_chatbot_passes_history_and_scope(client, monkeypatch):
    seen = {}

    def fake(query, title=None, history=None):
        seen.update(query=query, title=title, history=history)
        return {"response": "r", "sources": [], "grounded": False}

    monkeypatch.setattr(app_module.services, "answer", fake)
    history = [{"role": "user", "content": "hi"}]
    r = client.post("/chatbot", json={"query": "q", "title": "P", "history": history})
    assert r.status_code == 200 and r.get_json()["query"] == "q"
    assert seen == {"query": "q", "title": "P", "history": history}


def test_errors_do_not_leak_details(client, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("secret sk-abc123")

    monkeypatch.setattr(app_module.services, "summarize", boom)
    r = client.post("/summary", json={"title": "T"})
    assert r.status_code == 500 and "sk-abc123" not in r.get_data(as_text=True)


def test_summary_reports_cache_flag(client, monkeypatch):
    monkeypatch.setattr(app_module.services, "summarize", lambda t, refresh=False: ("text", True))
    body = client.post("/summary", json={"title": "T"}).get_json()
    assert body["summary"] == "text" and body["cached"] is True


def test_summary_unknown_paper_is_404(client, monkeypatch):
    def missing(t, refresh=False):
        raise app_module.services.NotFound(t)

    monkeypatch.setattr(app_module.services, "summarize", missing)
    assert client.post("/summary", json={"title": "T"}).status_code == 404


def test_review_validates_payload(client):
    assert client.post("/review", json={"id": "1", "correct": True}).status_code == 400
    assert client.post("/review", json={"id": 1}).status_code == 400


def test_review_updates_card(client, monkeypatch):
    monkeypatch.setattr(app_module.db_extra, "review_card",
                        lambda cid, ok: {"id": cid, "box": 2, "due_in_days": 2})
    assert client.post("/review", json={"id": 1, "correct": True}).get_json()["box"] == 2


def test_review_unknown_card_is_404(client, monkeypatch):
    monkeypatch.setattr(app_module.db_extra, "review_card", lambda cid, ok: None)
    assert client.post("/review", json={"id": 9, "correct": False}).status_code == 404


def test_review_due_lists_cards(client, monkeypatch):
    monkeypatch.setattr(app_module.db_extra, "due_cards", lambda title: {"cards": [], "total": 0})
    assert client.get("/review/due").get_json() == {"cards": [], "total": 0}


def test_delete_requires_title_and_handles_missing(client, monkeypatch):
    assert client.delete("/papers").status_code == 400
    monkeypatch.setattr(app_module.db, "delete_paper", lambda t: False)
    assert client.delete("/papers?title=X").status_code == 404
    monkeypatch.setattr(app_module.db, "delete_paper", lambda t: True)
    assert client.delete("/papers?title=X").status_code == 200


def test_paper_file(client, monkeypatch):
    monkeypatch.setattr(app_module.db_extra, "get_paper_file", lambda t: None)
    assert client.get("/paper-file?title=X").status_code == 404
    monkeypatch.setattr(app_module.db_extra, "get_paper_file", lambda t: b"%PDF-1.4 data")
    r = client.get("/paper-file?title=X")
    assert r.status_code == 200 and r.mimetype == "application/pdf"


def test_assistant_requires_message(client):
    assert client.post("/assistant", json={"message": "   "}).status_code == 400
    assert client.post("/assistant", json={}).status_code == 400


def test_assistant_errors_do_not_leak_details(client, monkeypatch):
    def boom(message, titles=None, history=None):
        raise RuntimeError("secret sk-abc123")

    monkeypatch.setattr(app_module.assistant, "run", boom)
    r = client.post("/assistant", json={"message": "hi"})
    assert r.status_code == 500 and "sk-abc123" not in r.get_data(as_text=True)


def test_assistant_passes_scope_and_history(client, monkeypatch):
    seen = {}

    def fake(message, titles=None, history=None):
        seen.update(message=message, titles=titles, history=history)
        return {"response": "r", "sources": [], "grounded": False, "quiz": None,
                "summary": None, "tools_used": [], "agent": True}

    monkeypatch.setattr(app_module.assistant, "run", fake)
    history = [{"role": "user", "content": "hi"}]
    r = client.post("/assistant", json={"message": "quiz me", "titles": ["A", "B"], "history": history})
    assert r.status_code == 200 and r.get_json()["agent"] is True
    assert seen == {"message": "quiz me", "titles": ["A", "B"], "history": history}
