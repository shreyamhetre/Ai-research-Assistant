import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List

# Load the model
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

def generate_embeddings(text: str) -> List[float]:
    """
    Generate embeddings for the given text using Sentence Transformers.
    Args:
        text (str): The text to generate embeddings for.
    Returns:
        List[float]: A list of embeddings (vector).
    """
    print(f"[DEBUG] generate_embeddings called with text length: {len(text)}")

    if not text.strip():
        raise ValueError("Text cannot be empty for embeddings generation.")
    
    # Generate embeddings
    embeddings = embedding_model.encode(text).tolist()
    print(f"[DEBUG] Generated embedding of length: {len(embeddings)}")

    return embeddings

# def generate_embeddings(text):
#     """Generate embeddings for given text using SentenceTransformer."""
#     print(f"[DEBUG] generate_embeddings called with text length: {len(text)}")
#     try:
#         # Your existing code here
#         model = SentenceTransformer('all-MiniLM-L6-v2')
#         embeddings = model.encode(text)
        
#         # Make sure embeddings is a NumPy array
#         if not isinstance(embeddings, np.ndarray):
#             embeddings = np.array(embeddings)
            
#         print(f"[DEBUG] Generated embedding with shape: {embeddings.shape}")
#         return embeddings
#     except Exception as e:
#         print(f"[DEBUG] Error in generate_embeddings: {str(e)}")
#         raise
