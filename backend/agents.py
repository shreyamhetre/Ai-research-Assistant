import re
from crewai import Agent, Task
from typing import List, Dict
from model import GeminiLLM, summarize_text, mcq_generate, custom_data_retriever
from config import Config
from vector_db import get_content_and_title
from utils.embeddings import generate_embeddings
from langchain_core.documents import Document
from langchain.chains import RetrievalQA
from langchain_core.retrievers import BaseRetriever


# Initialize LLM
llm = GeminiLLM(api_key=Config.GEMINI_API_KEY)

def content_retrieval_task(title: str) -> Dict:
    """
    Retrieves content and title from the database for a given title.
    """
    result = get_content_and_title(title)
    return result if result else {}

def summarization_task(title: str) -> str:
    """
    Generates a summary for the content of a given title.
    """
    result = get_content_and_title(title)
    if not result:
        return ""
    return summarize_text(result["content"])

def mcq_generation_task(title: str) -> list:
    """
    Generates MCQs based on the content of a given title.
    """
    result = get_content_and_title(title)
    if not result:
        return []
    return mcq_generate(result["content"])
    

def query_answering_task(query: str) -> str:
    """
    Answers a query by searching across all papers in the database using RAG.
    If no relevant content is found, falls back to a direct Gemini LLM response.
    """
    if not query:
        return "Query is required"
    
    query_embedding = generate_embeddings(query)
    documents = custom_data_retriever(query_embedding, k=5)
    
    # Check if we have relevant and sufficient documents
    has_relevant_info = False
    total_content_length = 0
    content_texts = []
    paper_title = "Unknown"
    
    if documents:
        # Check both keyword relevance AND content sufficiency
        query_keywords = query.lower().split()
        for doc in documents:
            content = doc.page_content.lower()
            content_texts.append(doc.page_content)
            total_content_length += len(content)
            
            # Check if document contains keywords from query
            if any(keyword in content for keyword in query_keywords):
                has_relevant_info = True
                paper_title = doc.metadata.get("title", "Unknown")
                print(f"[DEBUG] Relevant content found in paper: {paper_title}")
                break  # We only need the title of the top relevant document
    
    # Define minimum content threshold
    MIN_CONTENT_LENGTH = 50
    has_sufficient_content = total_content_length >= MIN_CONTENT_LENGTH
    
    # Static prompt template
    static_prompt_template = """
    You are an expert research assistant specializing in academic papers.
    
    Please provide a clear, accurate, and helpful response to the following query.
    
    User Query: {query}
    
    {context_instruction}
    
    Guidelines for your response:
    1. Be concise and directly answer the query
    2. Use an academic but accessible tone
    3. If there is no relevant information, provide a general knowledge response and acknowledge the limitation
    4. Format your response in a structured way for readability
    5. If you don't have enough information to answer confidently, explain what further information would be needed
    6. Do NOT use Markdown formatting (e.g., no asterisks *, bold **, or bullet points)
    
    Your response:
    """
    
    # CASE 1: If we have BOTH relevant AND sufficient content
    if has_relevant_info and has_sufficient_content:
        context_text = "\n\n".join(content_texts)
        context_instruction = f"Here are relevant sections from the paper '{paper_title}' to help you answer:\n\n{context_text}"
        complete_prompt = static_prompt_template.format(
            query=query,
            context_instruction=context_instruction
        )
        response = llm._call(complete_prompt)
        # Clean the response to remove Markdown formatting
        clean_response = re.sub(r'\*\*|\*', '', response).strip()
        return clean_response
    
    # CASE 2: If we have relevance but INSUFFICIENT content
    elif has_relevant_info and not has_sufficient_content:
        context_text = "\n\n".join(content_texts)
        context_instruction = f"""
        The paper '{paper_title}' mentions concepts related to your query, but I only have limited excerpts:
        
        {context_text}
        
        This limited information suggests the topic is addressed in the paper, but I don't have enough context to provide a complete answer. I'll provide what insights I can based on the available content and general knowledge.
        """
        complete_prompt = static_prompt_template.format(
            query=query,
            context_instruction=context_instruction
        )
        response = llm._call(complete_prompt)
        # Clean the response to remove Markdown formatting
        clean_response = re.sub(r'\*\*|\*', '', response).strip()
        return clean_response
    
    # CASE 3: No relevant content found
    else:
        print("[DEBUG] No relevant content found in any paper. Falling back to direct Gemini response.")
        context_instruction = """
        Based on my analysis, I couldn't find specific information in the stored papers addressing this query. 
        I'll provide a general knowledge response.
        """
        complete_prompt = static_prompt_template.format(
            query=query,
            context_instruction=context_instruction
        )
        response = llm._call(complete_prompt)
        # Clean the response to remove Markdown formatting
        clean_response = re.sub(r'\*\*|\*', '', response).strip()
        return clean_response

# Define Agents with their respective tasks
summarizer_agent = Agent(
    role="Summarizer",
    goal="Generate concise summaries of research papers",
    backstory="An expert in distilling complex academic texts into clear summaries.",
    llm=llm,
    verbose=True,
    allow_delegation=False
)

mcq_generator_agent = Agent(
    role="MCQ Generator",
    goal="Create accurate multiple-choice questions based on paper content",
    backstory="A skilled educator crafting questions to test understanding.",
    llm=llm,
    verbose=True,
    allow_delegation=False
)

chatbot_agent = Agent(
    role="Research Assistant",
    goal="Answer user queries accurately using paper content",
    backstory="A knowledgeable assistant with access to research papers.",
    llm=llm,
    verbose=True,
    allow_delegation=False
)