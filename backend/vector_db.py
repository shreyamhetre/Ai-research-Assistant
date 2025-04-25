
import psycopg2
from sqlalchemy import create_engine, text
from config import Config
from utils.embeddings import generate_embeddings
from psycopg2.extras import execute_values
import numpy as np


engine = create_engine(Config.PG_DB_URI)

def db_connection():
    """
    Establish and return a connection to the PostgreSQL database.
    """
    try:
        conn = psycopg2.connect(
            dbname=Config.PG_DATABASE,
            user=Config.PG_USER,
            password=Config.PG_PASSWORD,
            host=Config.PG_HOST,
            port=Config.PG_PORT
        )
        print(f"[DEBUG] Connected to database: {Config.PG_DATABASE} on {Config.PG_HOST}:{Config.PG_PORT}")
        cur = conn.cursor()
        cur.execute("SELECT current_database(), current_schema()")
        db, schema = cur.fetchone()
        print(f"[DEBUG] Current database: {db}, Current schema: {schema}")
        cur.close()
        return conn
    except psycopg2.Error as e:
        print(f"[ERROR] Database connection error: {e}")
        return None

def store_to_pgvector(title, content, embedding, file_binary):
    """
    Store the extracted content, embeddings, and PDF into the PostgreSQL pgvector table.
    """
    conn = db_connection()

    if not conn:
        raise Exception("Failed to connect to database")
    try:
        cur = conn.cursor()

        # Ensure embedding is stored as a vector (list format for pgvector)
        embedding_str = f"[{','.join(map(str, embedding))}]"

        cur.execute(
            "INSERT INTO public.data (title, content, embedding, fileStorage) VALUES (%s, %s, %s, %s)",
            (title, content, embedding_str, psycopg2.Binary(file_binary))
        )

        conn.commit()
    except Exception as e:
        print(f"[ERROR] Database error: {e}")
        raise  # Re-raise the exception
    finally:
        if conn:
            cur.close()
            conn.close()
            
def get_content_and_title(title):
    """Retrieve content and title by title from the database."""
    query = "SELECT content, title FROM data WHERE title = :title"
    try:
        with engine.connect() as conn:
            print(f"[DEBUG] Executing query: {query} with title={title}")
            result = conn.execute(text(query), {"title": title}).fetchone()
            if result:
                print(f"[DEBUG] Found result with content length: {len(result[0])}")
                return {"content": result[0], "title": result[1]}
            else:
                print(f"[DEBUG] No content found for title: {title}")
                return None
    except Exception as e:
        print(f"[DEBUG] Error in get_content_and_title: {str(e)}")
        raise

def get_pdf_and_title(title):
    """Retrieve the PDF file (filestorage) and title by title from the database."""
    query = "SELECT filestorage, title FROM data WHERE title = :title"
    with engine.connect() as conn:
        result = conn.execute(text(query), {"title": title}).fetchone()
        return {"filestorage": result[0], "title": result[1]} if result else None


def debug_pgvector_table():
    """Debug function to check embeddings in the database."""
    try:
        conn = db_connection()
        if not conn:
            print("[ERROR] Failed to connect to database")
            return
        cur = conn.cursor()
        
        # Check if vector extension is installed
        cur.execute("SELECT extname FROM pg_extension WHERE extname = 'vector'")
        vector_extension = cur.fetchone()
        print(f"[DEBUG] Vector extension installed: {vector_extension is not None}")
        
        # Check table existence and schema
        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'data'")
        columns = cur.fetchall()
        if not columns:
            print("[ERROR] Table 'data' does not exist")
        else:
            print("[DEBUG] Table 'data' columns:")
            for col in columns:
                print(f"  - {col[0]}: {col[1]}")
        
        # Check rows for 'samplePaper'
        cur.execute("SELECT title, content, embedding IS NOT NULL AS has_embedding FROM data WHERE title = 'samplePaper'")
        row = cur.fetchone()
        if row:
            print(f"[DEBUG] Found row for 'samplePaper':")
            print(f"  - Title: {row[0]}")
            print(f"  - Content length: {len(row[1])}")
            print(f"  - Has embedding: {row[2]}")
            cur.execute("SELECT embedding::text FROM data WHERE title = 'samplePaper'")
            embedding_text = cur.fetchone()[0]
            print(f"  - Embedding sample: {embedding_text[:50]}...")
        else:
            print("[DEBUG] No row found for 'samplePaper'")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[ERROR] Debug pgvector error: {str(e)}")


