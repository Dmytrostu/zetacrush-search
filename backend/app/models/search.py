# filename: app/models/search.py
from typing import List, Optional, Dict, Any, TypedDict

# Simple dataclasses using regular Python dict/TypedDict instead of Pydantic

class SearchQuery:
    def __init__(self, query: str, page: int = 1, page_size: int = 10, 
                 filter_by: Optional[Dict[str, Any]] = None, 
                 sort_by: Optional[str] = None, 
                 sort_order: str = "desc"):
        self.query = query
        # Validate parameters
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 1
        if page_size > 100:
            page_size = 100
        self.page = page
        self.page_size = page_size
        self.filter_by = filter_by
        self.sort_by = sort_by
        self.sort_order = sort_order if sort_order in ["asc", "desc"] else "desc"

class SearchHighlight:
    def __init__(self, title: Optional[List[str]] = None, text: Optional[List[str]] = None):
        self.title = title
        self.text = text
        
    def dict(self):
        return {"title": self.title, "text": self.text}

class SearchResultItem:
    def __init__(self, id: str, title: str, text: str, score: float, 
                 contributor: Optional[str] = None, timestamp: Optional[str] = None, 
                 highlights: Optional[SearchHighlight] = None):
        self.id = id
        self.title = title
        self.text = text
        self.contributor = contributor
        self.timestamp = timestamp
        self.score = score
        self.highlights = highlights
        
    def dict(self):
        result = {
            "id": self.id,
            "title": self.title, 
            "text": self.text,
            "contributor": self.contributor,
            "timestamp": self.timestamp,
            "score": self.score
        }
        if self.highlights:
            result["highlights"] = self.highlights.dict()
        return result

class SearchResponse:
    def __init__(self, total: int, page: int, page_size: int, results: List[SearchResultItem], 
                 suggest: Optional[List[str]] = None):
        self.total = total
        self.page = page
        self.page_size = page_size
        self.results = results
        self.suggest = suggest
        
    def dict(self):
        return {
            "total": self.total,
            "page": self.page,
            "page_size": self.page_size,
            "results": [result.dict() for result in self.results],
            "suggest": self.suggest
        }