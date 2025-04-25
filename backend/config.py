import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

class Config:
    PG_HOST = os.getenv("PG_HOST")
    PG_PORT = os.getenv("PG_PORT")
    PG_USER = os.getenv("PG_USER")
    PG_PASSWORD = os.getenv("PG_PASSWORD")
    PG_DATABASE = os.getenv("PG_DATABASE")
    
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    
    PG_DB_URI = f"postgresql+psycopg2://{PG_USER}:{PG_PASSWORD}@{PG_HOST}:{PG_PORT}/{PG_DATABASE}"

# class Config:
#     PG_HOST = 'localhost'  # Use 'localhost' when connecting to Docker container on same machine
#     PG_PORT = 5433  # The mapped port you specified in Docker run command
#     PG_DATABASE = 'postgres'  # Try connecting to the default postgres database
#     PG_USER = 'postgres'
#     PG_PASSWORD = '123456789'