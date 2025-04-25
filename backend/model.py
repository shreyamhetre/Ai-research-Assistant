import re
import requests
from config import Config
from langchain.llms.base import LLM
from typing import Optional, List, Mapping, Any
from langchain.chains import RetrievalQA
from langchain_core.embeddings import Embeddings
from langchain_core.documents import Document
from utils.embeddings import generate_embeddings
import psycopg2
from psycopg2.extras import execute_values


GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent"

# Custom Embedding class
class CustomSentenceTransformerEmbeddings(Embeddings):
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        print(f"[DEBUG] embed_documents called with {len(texts)} texts")
        return [generate_embeddings(text) for text in texts]

    def embed_query(self, text: str) -> List[float]:
        print(f"[DEBUG] embed_query called with: {text[:50]}...")
        embedding = generate_embeddings(text)
        print(f"[DEBUG] Generated query embedding of length: {len(embedding)}")
        return embedding
    
# Custom Gemini LLM class
class GeminiLLM(LLM):
    api_key: str
    model: str = "gemini-1.5-pro"
    url: str = GEMINI_API_URL

    def _call(self, prompt: str, stop: Optional[List[str]] = None) -> str:
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        headers = {"Content-Type": "application/json"}
        response = requests.post(f"{self.url}?key={self.api_key}", json=payload, headers=headers)
        if response.status_code == 200:
            return response.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        else:
            print(f"[ERROR] Gemini API Error: {response.status_code} - {response.text}")
            return "Sorry, I couldn't process your query."

    @property
    def _identifying_params(self) -> Mapping[str, Any]:
        return {"model": self.model, "api_key": self.api_key}

    @property
    def _llm_type(self) -> str:
        return "gemini"
    

def custom_data_retriever(query_embedding: List[float], k: int = 5) -> List[Document]:
    """
    Perform a similarity search on the data table's embedding column across all papers.
    Returns the top k documents with their titles in metadata.
    """
    conn = None
    try:
        conn = psycopg2.connect(
            dbname=Config.PG_DATABASE,
            user=Config.PG_USER,
            password=Config.PG_PASSWORD,
            host=Config.PG_HOST,
            port=Config.PG_PORT
        )
        cur = conn.cursor()

        # Convert query_embedding to vector string
        query_vector = f"[{','.join(map(str, query_embedding))}]"

        # Cosine similarity query across all papers
        cur.execute(
            """
            SELECT title, content
            FROM data
            ORDER BY embedding <=> %s
            LIMIT %s
            """,
            (query_vector, k)
        )
        results = cur.fetchall()

        # Convert to LangChain Documents
        documents = [
            Document(
                page_content=row[1],
                metadata={"title": row[0]}
            )
            for row in results
        ]

        print(f"[DEBUG] Retrieved {len(documents)} documents across all papers")
        if documents:
            print(f"[DEBUG] Top matching paper title: {documents[0].metadata['title']}")
        return documents

    except Exception as e:
        print(f"[ERROR] Custom retriever error: {e}")
        return []
    finally:
        if conn:
            cur.close()
            conn.close()

# Initialize embeddings and LLM
print("[DEBUG] Initializing CustomSentenceTransformerEmbeddings")
embeddings = CustomSentenceTransformerEmbeddings()

print("[DEBUG] Creating GeminiLLM")
llm = GeminiLLM(api_key=Config.GEMINI_API_KEY)

def summarize_text(content):
    """
    Summarize the given content using Gemini API.
    """
    try:
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": f"summarize this: {content} in short"
                        }
                    ]
                }
            ]
        }
        headers = {"Content-Type": "application/json"}
        url = GEMINI_API_URL
        api_key = Config.GEMINI_API_KEY 

        response = requests.post(f"{url}?key={api_key}", json=payload, headers=headers)

        # Debugging response
        print(f"[DEBUG] Summary API Response: {response.text}")

        # Parse and return the summary
        if response.status_code == 200:
            result = response.json()
            summary = result["candidates"][0]["content"]["parts"][0]["text"]
            return summary.strip()
        else:
            print(f"[ERROR] API Error: {response.text}")
            return ""

    except Exception as e:
        print(f"[ERROR] Failed to call Gemini API: {e}")
        return ""

def mcq_generate(content):
    try:
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": (
                                f"Create 5 MCQ questions with four options each and the correct answer. "
                                f"The questions should be based on the following content: {content}"
                            )
                        }
                    ]
                }
            ]
        }
        headers = {"Content-Type": "application/json"}
        url = GEMINI_API_URL
        api_key = Config.GEMINI_API_KEY
        response = requests.post(f"{url}?key={api_key}", json=payload, headers=headers)
        if response.status_code == 200:
            result = response.json()
            candidates = result.get("candidates", [])
            print(f"[DEBUG] API Response: {response.json()}")

            if candidates:
                mcqs_text = candidates[0]["content"]["parts"][0]["text"]
                print(f"[DEBUG] Raw mcqs_text: {repr(mcqs_text)[:500]}...")  # Log raw text for inspection
                print(f"[DEBUG] crew ai mcqs_text: {mcqs_text[:500]}...")  # Truncated for readability
                parsed_mcqs = parse_mcqs(mcqs_text)
                print(f"[DEBUG] Parsed MCQs: {parsed_mcqs}")
                return parsed_mcqs

        print(f"[ERROR] API Error: {response.text}")
        return []

    except Exception as e:
        print(f"[ERROR] Failed to call Gemini API: {e}")
        return []

def parse_mcqs(text):
    try:
        mcqs = []
        text = re.sub(r'\n\s*\n+', '\n\n', text.replace('\r\n', '\n').strip())
        
        blocks = re.split(r'\n\n(?=\*\*[0-5]\.)', text)
        print(f"[DEBUG] Found {len(blocks)} question blocks")
        
        for i, block in enumerate(blocks):
            block = block.strip()
            if not block:
                print(f"[DEBUG] Skipping block {i+1}: Empty block")
                continue
                
            lines = [line.strip() for line in block.split('\n') if line.strip()]
            print(f"[DEBUG] Block {i+1} has {len(lines)} lines: {lines[:2]}...")
            
            if len(lines) >= 6:
                question_line = lines[0].replace("**", "").strip()
                question = re.sub(r'^\d+\.\s*', '', question_line).strip()
                
                options = [line.strip() for line in lines[1:5] if line.strip()]
                
                answer_line = lines[5].strip()
                correct_answer = "N/A"
                
                if answer_line.startswith("**Answer:"):
                    correct_answer = re.sub(r'\*\*', '', answer_line.replace("**Answer:", "").strip())
                
                if len(options) == 4 and correct_answer != "N/A":
                    mcqs.append({
                        "question": question,
                        "options": options,
                        "correct_answer": correct_answer
                    })
                    print(f"[DEBUG] Parsed MCQ {i+1}: {mcqs[-1]}")
                else:
                    print(f"[DEBUG] Skipping block {i+1}: Invalid options ({len(options)}) or answer ({correct_answer})")
            else:
                print(f"[DEBUG] Skipping block {i+1}: Not enough lines ({len(lines)})")
        
        print(f"[DEBUG] Total parsed MCQs: {len(mcqs)}")
        return mcqs
    
    except Exception as e:
        print(f"[ERROR] Failed to parse MCQs: {e}")
        return []