import logging

from flask import Flask, jsonify, request
from flask_cors import CORS

import db
import services
from config import Config

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("app")

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = Config.MAX_UPLOAD_MB * 1024 * 1024
CORS(app)


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


@app.errorhandler(413)
def too_large(_):
    return err(f"File too large (max {Config.MAX_UPLOAD_MB} MB)", 413)


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


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


def _title_from_body():
    title = (request.get_json(silent=True) or {}).get("title")
    return title if title else None


@app.route("/summary", methods=["POST"])
def summary():
    title = _title_from_body()
    if not title:
        return err("Title is required", 400)
    try:
        return jsonify({"title": title, "summary": services.summarize(title)})
    except services.NotFound:
        return err("Paper not found", 404)
    except Exception as e:
        log.exception("summary failed")
        return server_error(e)


@app.route("/createMcq", methods=["POST"])
def create_mcq():
    title = _title_from_body()
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


@app.route("/chatbot", methods=["POST"])
def chatbot():
    body = request.get_json(silent=True) or {}
    query = (body.get("query") or "").strip()
    if not query:
        return err("Query is required", 400)
    try:
        result = services.answer(query, body.get("title") or None)
        return jsonify({"query": query, **result})
    except Exception as e:
        log.exception("chatbot failed")
        return server_error(e)


if __name__ == "__main__":
    app.run(port=5000, debug=True)
