# filename: run.py
from app.main import app

# It exports the FastAPI application as app
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)