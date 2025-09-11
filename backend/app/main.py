# filename: app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import search
from app.config import settings
import logging
import os

# Check if running in serverless environment
IS_SERVERLESS = os.environ.get("VERCEL", "0") == "1"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(
    title=settings.app_name,
    description="API for searching wiki articles in Elasticsearch",
    version="1.0.0",
    # Special configuration for serverless environments
    root_path="",
)

# Configure CORS - More permissive in serverless environments
app.add_middleware(
    CORSMiddleware,
    # In serverless, allow all origins to prevent CORS issues
    allow_origins=["*"] if IS_SERVERLESS else settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(search.router)

@app.get("/")
async def root():
    return {"message": "Welcome to the Wiki Search API. Go to /docs for API documentation."}

# Add this at the end of your main.py file
# This ensures Vercel can properly run your FastAPI app

# When running on Vercel, add a logging config
import logging
logger = logging.getLogger("uvicorn")
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Optional - For Vercel analytics
@app.middleware("http")
async def add_process_time_header(request, call_next):
    import time
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response