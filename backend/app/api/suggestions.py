from fastapi import APIRouter, Query, HTTPException
from app.models.suggestions import SuggestionQuery, SuggestionResponse
from app.services.suggestions import get_suggestions
import logging

router = APIRouter(prefix="/api", tags=["suggestions"])
logger = logging.getLogger(__name__)

@router.get("/suggest", response_model=SuggestionResponse)
async def suggestions_endpoint(
    query: str = Query(..., description="Query prefix to get suggestions for"),
    max_suggestions: int = Query(10, ge=1, le=20, description="Maximum number of suggestions to return")
):
    """Get search suggestions based on user input"""
    try:
        suggestion_query = SuggestionQuery(
            query=query,
            max_suggestions=max_suggestions
        )
        result = await get_suggestions(suggestion_query)
        return result
    except Exception as e:
        logger.error(f"Suggestions error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {str(e)}")