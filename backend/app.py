import logging
from typing import List
from flask_cors import CORS
from flask import Flask, request, jsonify
from utils.pdf_parser import extract_text_from_pdf
from vector_db import db_connection, store_to_pgvector, get_content_and_title, debug_pgvector_table
from model import summarize_text, mcq_generate, embeddings, custom_data_retriever, llm
from utils.embeddings import generate_embeddings
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from langchain.chains import RetrievalQA
import torchvision
from crew import run_crew

from agents import summarization_task 
torchvision.disable_beta_transforms_warning()

app = Flask(__name__)
CORS(app)

@app.route('/upload', methods=['POST'])
def upload_paper():
    try:
        title = request.form.get("title")
        file = request.files.get("file")

        if not title or not file:
            return jsonify({"error": "Title and file are required"}), 400

        text_content = extract_text_from_pdf(file)
        if not text_content:
            return jsonify({"error": "Failed to extract text from PDF"}), 500

        embeddings = generate_embeddings(text_content)

        file.seek(0)
        file_binary = file.read()

        store_to_pgvector(title, text_content, embeddings, file_binary)

        return jsonify({"message": "PDF uploaded and stored successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/summary', methods=['POST'])
def summarize_pdf():
    try:
        title = request.json.get("title")
        if not title:
            return jsonify({"error": "Title is required"}), 400
        
        result = run_crew(task_type="summarize", title=title)
        if not result or "output" not in result:
            return jsonify({"error": "Failed to generate summary"}), 500
            
        return jsonify({"title": title, "summary": result["output"]}), 200
    except Exception as e:
        logging.error(f"Error in /summary: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

def summarize_pdf():
    try:
        title = request.json.get("title")
        if not title:
            return jsonify({"error": "Title is required"}), 400
        
        # Directly call the summarization function
        summary = summarization_task(title)
        return jsonify({"title": title, "summary": summary}), 200
    except Exception as e:
        logging.error(f"Error in /summary: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    
@app.route('/createMcq', methods=['POST'])
def create_mcq():
    try:
        title = request.json.get("title")
        if not title:
            return jsonify({"error": "Title is required"}), 400
        
        result = run_crew(task_type="mcq", title=title)
        if not result or "output" not in result:
            return jsonify({"error": "Failed to generate MCQs"}), 500
            
        return jsonify({"title": title, "mcqs": result["output"]}), 200
    except Exception as e:
        logging.error(f"Error in /createMcq: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/chatbot', methods=['POST'])
def chatbot():
    try:
        data = request.json
        query = data.get("query")
        if not query:
            return jsonify({"error": "Query is required"}), 400
        
        result = run_crew(task_type="chatbot", title=None, query=query)
        if not result or "output" not in result:
            return jsonify({"error": "Failed to generate response"}), 500
            
        return jsonify({"query": query, "response": result["output"]}), 200
    except Exception as e:
        logging.error(f"Error in /chatbot: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    
@app.route('/fetch-titles', methods=['GET'])
def fetch_titles():
    try:
        conn = db_connection()
        if not conn:
            return jsonify({"error": "Failed to connect to database"}), 500
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT title FROM public.data")
        titles = [row[0] for row in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify({"titles": titles}), 200
    except Exception as e:
        logging.error(f"Error in /fetch-titles: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    
if __name__ == "__main__":
    app.run(debug=True)