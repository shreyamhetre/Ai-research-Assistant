# AI-RESEARCH-ASSISTANT

**AI-RESEARCH-ASSISTANT** is a powerful AI-driven backend application designed to assist researchers, students, and academics in processing and analyzing academic papers. It enables users to upload PDF papers, store their content and embeddings in a PostgreSQL database with pgvector, generate concise summaries, create multiple-choice questions (MCQs), and answer queries using a Retrieval-Augmented Generation (RAG) approach. Built with a modern tech stack, ScholarAI showcases advanced skills in backend development, AI integration, and database management.

---

## Features

- **PDF Upload and Processing**: Upload academic papers in PDF format, extract text, and generate embeddings for semantic search.
- **Summarization**: Generate concise summaries of paper content using the Gemini LLM API.
- **MCQ Generation**: Automatically create multiple-choice questions based on paper content to aid learning and assessment.
- **Chatbot Query Answering**: Answer user queries by retrieving relevant paper content using RAG and falling back to general knowledge when needed.
- **Database Management**: Store paper metadata, content, embeddings, and binary files in PostgreSQL with pgvector for efficient similarity search.
- **RESTful API**: Expose endpoints for uploading papers, fetching summaries, generating MCQs, querying the chatbot, and retrieving paper titles.
- **Scalable Architecture**: Built with Flask and modular code structure for extensibility and maintainability.

---

## Tech Stack

- **Backend Framework**: Flask (Python) for building a lightweight and flexible RESTful API.
- **Database**: PostgreSQL with pgvector extension for storing paper data and performing vector-based similarity searches.
- **AI and NLP**:
  - **Gemini LLM API**: For summarization, MCQ generation, and query answering.
  - **LangChain**: For implementing RAG and managing document retrieval.
  - **Sentence Transformers**: For generating embeddings to enable semantic search.
- **CrewAI**: For orchestrating AI tasks like summarization, MCQ generation, and query answering.
- **PDF Processing**: Custom utilities for extracting text from PDFs.
- **Environment Management**: dotenv for secure configuration handling.
- **Logging and Debugging**: Comprehensive logging for error tracking and debugging.
- **Additional Libraries**: psycopg2, SQLAlchemy, torchvision, and more for database connectivity and utility functions.

---

## Skills Demonstrated

This project showcases a wide range of technical and problem-solving skills:

- **Backend Development**:
  - Designed and implemented a RESTful API using Flask with CORS support.
  - Structured modular code with separate concerns (e.g., `app.py`, `agents.py`, `model.py`, `vector_db.py`, `crew.py`).
  - Handled file uploads, binary data storage, and JSON request/response processing.
- **Database Management**:
  - Configured and managed PostgreSQL with the pgvector extension for vector storage and similarity search.
  - Wrote efficient SQL queries for data retrieval and storage.
  - Used SQLAlchemy for ORM-like database interactions and psycopg2 for low-level operations.
- **AI and Machine Learning**:
  - Integrated the Gemini LLM API for natural language processing tasks.
  - Implemented RAG using LangChain for context-aware query answering.
  - Generated and stored embeddings for semantic search using Sentence Transformers.
  - Developed parsing logic for MCQ generation with regex and text processing.
- **Natural Language Processing**:
  - Built utilities for PDF text extraction and content summarization.
  - Designed a query-answering system with relevance and content sufficiency checks.
- **DevOps and Configuration**:
  - Managed environment variables using dotenv for secure configuration.
  - Configured database connections with robust error handling.
- **Error Handling and Debugging**:
  - Implemented comprehensive logging for debugging and error tracking.
  - Designed fallback mechanisms (e.g., general knowledge responses when RAG lacks context).
- **System Design**:
  - Architected a scalable system with clear separation of concerns (e.g., agents, models, database utilities).
  - Optimized for performance with efficient database queries and embedding generation.
- **API Integration**:
  - Integrated third-party APIs (Gemini) with custom payloads and response parsing.
  - Handled API errors gracefully with fallback responses.
- **Team-Oriented Development**:
  - Wrote clean, documented code following Python best practices.
  - Structured the project for easy collaboration and future extensions.

---

## Project Structure
