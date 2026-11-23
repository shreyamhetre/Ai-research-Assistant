import logging
import os

from flask import Flask, Response, jsonify, request
from flask_cors import CORS

import assistant
import db
import db_extra
import services
from config import Config

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("app")

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = Config.MAX_UPLOAD_MB * 1024 * 1024
CORS(app)

_schema_ready = False


@app.before_request
def _bootstrap_schema():
    """Bring an existing database up to date the first time any request arrives."""
    global _schema_ready
    if not _schema_ready and request.endpoint != "health":
        db_extra.ensure_schema()
        _schema_ready = True


def err(message: str, status: int):
    return jsonify({"error": message}), status


def server_error(e: Exception):
    """Never echo raw exception text to clients: provider errors can include key fragments."""
    from openai import AuthenticationError, RateLimitError
    if isinstance(e, AuthenticationError):
        return err("LLM authentication failed. Check OPENAI_API_KEY on the server.", 502)
    if isinstance(e, RateLimitError):
        return err("LLM rate limit or quota reached. Try again later.", 429)
    return err("Internal server error. See server log.", 500)


def body() -> dict:
    return request.get_json(silent=True) or {}


@app.errorhandler(413)
def too_large(_):
    return err(f"File too large (max {Config.MAX_UPLOAD_MB} MB)", 413)


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


# ------------------------------------------------------------------ library
@app.route("/upload", methods=["POST"])
def upload():
    title = (request.form.get("title") or "").strip()
    file = request.files.get("file")
    if not title or not file:
        return err("Title and file are required", 400)

    data = file.read()
    if not data.startswith(b"%PDF"):
        return err("Only PDF files are supported", 400)

    try:
        n = services.ingest(title, data)
    except db.DuplicateTitle:
        return err(f"A paper titled '{title}' already exists", 409)
    except ValueError as e:
        return err(str(e), 422)
    except Exception as e:
        log.exception("upload failed")
        return server_error(e)
    return jsonify({"message": "Paper uploaded", "chunks": n}), 200


@app.route("/fetch-titles", methods=["GET"])
def fetch_titles():
    try:
        return jsonify({"titles": db.list_titles()})
    except Exception as e:
        log.exception("fetch-titles failed")
        return server_error(e)


@app.route("/papers", methods=["GET"])
def papers():
    try:
        return jsonify({"papers": db.list_papers()})
    except Exception as e:
        log.exception("papers failed")
        return server_error(e)


@app.route("/papers", methods=["DELETE"])
def delete_paper():
    title = request.args.get("title", "")
    if not title:
        return err("Title is required", 400)
    try:
        if not db.delete_paper(title):
            return err("Paper not found", 404)
        return jsonify({"message": "Deleted"})
    except Exception as e:
        log.exception("delete failed")
        return server_error(e)


@app.route("/paper-file", methods=["GET"])
def paper_file():
    """The original PDF, so the UI can open a citation at its page (#page=N)."""
    title = request.args.get("title", "")
    try:
        data = db_extra.get_paper_file(title) if title else None
    except Exception as e:
        log.exception("paper-file failed")
        return server_error(e)
    if not data:
        return err("Paper not found", 404)
    return Response(data, mimetype="application/pdf",
                    headers={"Content-Disposition": "inline; filename=paper.pdf"})


# ------------------------------------------------------------------ summaries and quizzes
@app.route("/summary", methods=["POST"])
def summary():
    title = body().get("title")
    if not title:
        return err("Title is required", 400)
    try:
        text, cached = services.summarize(title, refresh=bool(body().get("refresh")))
        return jsonify({"title": title, "summary": text, "cached": cached})
    except services.NotFound:
        return err("Paper not found", 404)
    except Exception as e:
        log.exception("summary failed")
        return server_error(e)


@app.route("/createMcq", methods=["POST"])
def create_mcq():
    title = body().get("title")
    if not title:
        return err("Title is required", 400)
    try:
        mcqs = services.make_mcqs(title)
        if not mcqs:
            return err("Could not generate questions, try again", 502)
        return jsonify({"title": title, "mcqs": mcqs})
    except services.NotFound:
        return err("Paper not found", 404)
    except Exception as e:
        log.exception("mcq failed")
        return server_error(e)


@app.route("/review/due", methods=["GET"])
def review_due():
    try:
        return jsonify(db_extra.due_cards(request.args.get("title") or None))
    except Exception as e:
        log.exception("review/due failed")
        return server_error(e)


@app.route("/review", methods=["POST"])
def review():
    b = body()
    if not isinstance(b.get("id"), int) or not isinstance(b.get("correct"), bool):
        return err("id (int) and correct (bool) are required", 400)
    try:
        result = db_extra.review_card(b["id"], b["correct"])
        return jsonify(result) if result else err("Card not found", 404)
    except Exception as e:
        log.exception("review failed")
        return server_error(e)


# ------------------------------------------------------------------ chat and comparison
@app.route("/chatbot", methods=["POST"])
def chatbot():
    b = body()
    query = (b.get("query") or "").strip()
    if not query:
        return err("Query is required", 400)
    try:
        result = services.answer(query, b.get("title") or None, b.get("history"))
        return jsonify({"query": query, **result})
    except Exception as e:
        log.exception("chatbot failed")
        return server_error(e)


@app.route("/assistant", methods=["POST"])
def assistant_route():
    """Study Assistant: a CrewAI agent that answers, summarises or quizzes as the user asks."""
    b = body()
    message = (b.get("message") or "").strip()
    if not message:
        return err("Message is required", 400)
    try:
        return jsonify(assistant.run(message, b.get("titles"), b.get("history")))
    except Exception as e:
        log.exception("assistant failed")
        return server_error(e)


if __name__ == "__main__":
    app.run(host=os.getenv("HOST", "127.0.0.1"), port=5000, debug=os.getenv("FLASK_DEBUG") == "1")
