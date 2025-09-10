import os
from typing import List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get CORS origins from environment and parse
def parse_cors_origins() -> List[str]:
    origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    if not origins_str:
        return ["http://localhost:3000"]
        
    # Remove square brackets if present
    cleaned = origins_str.strip()
    if cleaned.startswith('[') and cleaned.endswith(']'):
        cleaned = cleaned[1:-1]
        
    # Split by comma
    origins = [origin.strip() for origin in cleaned.split(',') if origin.strip()]
    return origins if origins else ["http://localhost:3000"]

# Simple settings class
class Settings:
    app_name: str = "Wiki Search API"
    es_host: str = os.getenv("ES_HOST", "http://localhost:9200")
    es_user: str = os.getenv("ES_USER", "")
    es_apikey: str = os.getenv("ES_APIKEY", "")
    es_index: str = os.getenv("ES_INDEX", "wiki_articles")
    cors_origins: List[str] = parse_cors_origins()

# Create settings instance
settings = Settings()