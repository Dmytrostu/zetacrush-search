from pydantic import BaseModel, Field
from typing import List, Optional

class SuggestionQuery(BaseModel):
    """Model for suggestion query parameters"""
    query: str = Field(..., description="The search query prefix to get suggestions for")
    max_suggestions: int = Field(10, ge=1, le=20, description="Maximum number of suggestions to return")

class SuggestionResponse(BaseModel):
    """Model for suggestion response"""
    success: bool = True
    suggestions: List[str] = []
    is_static: Optional[bool] = False
    message: Optional[str] = None