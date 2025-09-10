from fastapi import APIRouter, HTTPException, Depends
from app.models.search import SearchQuery, SearchResponse
from app.services.elasticsearch import search, check_connection
# Import the new exception classes if you need to catch them specifically
import logging

router = APIRouter(prefix="/api", tags=["search"])
logger = logging.getLogger(__name__)

@router.get("/health")
async def health_check():
    """Check if the API and Elasticsearch are healthy"""
    es_health = await check_connection()
    return {"status": "ok", "elasticsearch": es_health}

@router.post("/search", response_model=SearchResponse)
async def search_endpoint(query: SearchQuery):
    """Search the Elasticsearch index"""
    try:
        result = await search(query)
        return result
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/search", response_model=SearchResponse)
async def search_get_endpoint(
    query: str,
    page: int = 1,
    page_size: int = 10,
    sort_by: str = None,
    sort_order: str = "desc"
):
    """Search endpoint for GET requests"""
    search_query = SearchQuery(
        query=query,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )
    try:
        result = await search(search_query)
        return result
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")