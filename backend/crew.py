# # This file is part of the CrewAI project.
from crewai import Crew, Task 
from agents import mcq_generation_task, query_answering_task, summarization_task


def run_crew(task_type: str, title: str, query: str = None):
    """
    Run the appropriate crew task based on the task type.
    """
    if task_type == "summarize":
        result = summarization_task(title)
        return {"output": result}
    
    elif task_type == "mcq":
        result = mcq_generation_task(title)
        return {"output": result}
    
    elif task_type == "chatbot" and query:
        result = query_answering_task(query)  # No title needed
        return {"output": result}
    
    else:
        raise ValueError(f"Invalid task type '{task_type}' or missing query for chatbot task")