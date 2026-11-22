import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Required: no fallbacks, so a missing .env fails loudly instead of using guessable defaults.
    PG_HOST = os.environ["PG_HOST"]
    PG_PORT = os.environ["PG_PORT"]
    PG_USER = os.environ["PG_USER"]
    PG_PASSWORD = os.environ["PG_PASSWORD"]
    PG_DATABASE = os.environ["PG_DATABASE"]

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
    # Local Hugging Face model. If you change it, update vector(N) in db/init.sql.
    # bge-base-en-v1.5 -> 768 dims, bge-small-en-v1.5 -> 384, bge-m3 -> 1024
    EMBED_MODEL = os.getenv("EMBED_MODEL", "BAAI/bge-base-en-v1.5")

    MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "25"))

    CHUNK_CHARS = 1800
    CHUNK_OVERLAP = 250
    TOP_K = 8
    # cosine distance above this is treated as "not in the papers"
    MAX_DISTANCE = 0.50
