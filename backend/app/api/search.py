from fastapi import APIRouter, HTTPException, Depends, Query
from app.models.search import SearchQuery, SearchResponse
from app.services.elasticsearch import search, check_connection
import logging
from typing import Dict, Any, Optional

router = APIRouter(prefix="/api", tags=["search"])
logger = logging.getLogger(__name__)

@router.get("/health")
async def health_check():
    """Check if the API and Elasticsearch are healthy"""
    es_health = check_connection()  # Removed await
    return {"status": "ok", "elasticsearch": es_health}

@router.post("/search")
async def search_endpoint(request: Dict[str, Any]):
    """Search the Elasticsearch index"""
    try:
        # Create SearchQuery from request body
        query = SearchQuery(
            query=request.get("query", ""),
            page=request.get("page", 1),
            page_size=request.get("page_size", 10),
            filter_by=request.get("filter_by"),
            sort_by=request.get("sort_by"),
            sort_order=request.get("sort_order", "desc")
        )
        result = search(query)  # Removed await
        return result.dict()
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/search")
async def search_get_endpoint(
    query: str = Query(..., description="Search query string"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Results per page"),
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: str = Query("desc", description="Sort order (asc or desc)")
):
    """Search endpoint for GET requests"""
    try:
        # Create SearchQuery object from parameters
        search_query = SearchQuery(
            query=query,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order
        )
        result = search(search_query)  # Removed await
        return result.dict()
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")