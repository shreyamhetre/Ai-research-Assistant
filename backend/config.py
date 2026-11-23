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

    # Chunking
    CHUNK_CHARS = 900
    CHUNK_OVERLAP = 150

    # Retrieval: candidates from each retriever -> fused -> reranked -> top-k
    N_VECTOR = 30
    N_KEYWORD = 30
    N_RERANK = 20          # ~3 s on CPU; hybrid recall@10 was already 100% on the eval set
    TOP_K = 5
    RERANK_MODEL = os.getenv("RERANK_MODEL", "BAAI/bge-reranker-base")
    # Cheap pre-check for clearly off-topic questions: both signals must be low.
    # (Reranker scores for abstract questions are low even when correct, so this is only a
    # coarse filter; the LLM decides whether the excerpts really answer the question.)
    OFF_TOPIC_RERANK = 0.005
    OFF_TOPIC_SIM = 0.50

    # Chat memory: how many previous messages are sent to the model
    HISTORY_MESSAGES = 6

    # Study Assistant (CrewAI agent): cap on reasoning/tool steps per message
    AGENT_MAX_ITER = 5
