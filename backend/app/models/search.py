# filename: app/models/search.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class SearchQuery(BaseModel):
    query: str
    page: int = Field(1, ge=1)
    page_size: int = Field(10, ge=1, le=100)
    filter_by: Optional[Dict[str, Any]] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = "desc"

class SearchHighlight(BaseModel):
    title: Optional[List[str]] = None
    text: Optional[List[str]] = None

class SearchResultItem(BaseModel):
    id: str
    title: str
    text: str
    contributor: Optional[str] = None
    timestamp: Optional[str] = None
    score: float
    highlights: Optional[SearchHighlight] = None

class SearchResponse(BaseModel):
    total: int
    page: int
    page_size: int
    results: List[SearchResultItem]
    suggest: Optional[List[str]] = None