from elasticsearch import Elasticsearch, ApiError, TransportError
from app.config import settings
from app.models.search import SearchQuery, SearchResponse, SearchResultItem, SearchHighlight
import logging
import os
from typing import Dict, Any, List, Optional
from functools import lru_cache

logger = logging.getLogger(__name__)

# Configure Elasticsearch client options
@lru_cache()

def get_elasticsearch_client() -> Elasticsearch:
    """Get or create an Elasticsearch client"""
    from app.config import settings
    
    # Create a new client or return an existing one
    client = Elasticsearch( settings.es_host, api_key=settings.es_apikey)
    
    return client

# Get client instance
try:
    es = get_elasticsearch_client()
    logger.info("Successfully initialized Elasticsearch client")
except Exception as e:
    logger.error(f"Failed to initialize Elasticsearch client: {str(e)}")
    # Re-raise the exception for proper error handling
    raise
    
    es = AsyncElasticWrapper(sync_es)
    logger.info("Using synchronous Elasticsearch client with async wrapper")

def check_connection() -> bool:
    """Check if Elasticsearch connection is successful"""
    try:
        client = get_elasticsearch_client()
        return client.ping()
    except ValueError as e:
        if "aiohttp" in str(e):
            logger.error("Missing aiohttp dependency. Make sure aiohttp is installed.")
            return {"error": "Missing aiohttp dependency", "message": str(e)}
        else:
            logger.error(f"Elasticsearch value error: {str(e)}")
            return False
    except Exception as e:
        logger.error(f"Elasticsearch connection error: {str(e)}")
        return False

def _build_elasticsearch_query(search_params: SearchQuery) -> Dict[str, Any]:
    """Build Elasticsearch query from search parameters"""
    # Calculate pagination
    from_val = (search_params.page - 1) * search_params.page_size
    
    # Base query
    query = {
        "from": from_val,
        "size": search_params.page_size,
        "query": {
            "multi_match": {
                "query": search_params.query,
                "fields": ["title^3", "text^2", "comment^1"],
                "fuzziness": "AUTO",
                "operator": "or"
            }
        },
        "highlight": {
            "fields": {
                "title": {"number_of_fragments": 1},
                "text": {"number_of_fragments": 1, "fragment_size": 150}
            },
            "pre_tags": ["<mark>"],
            "post_tags": ["</mark>"]
        }
    }
    
    # Add filtering if present
    if search_params.filter_by:
        filter_clauses = []
        for field, value in search_params.filter_by.items():
            if isinstance(value, list):
                filter_clauses.append({"terms": {field: value}})
            else:
                filter_clauses.append({"term": {field: value}})
        
        query["query"] = {
            "bool": {
                "must": query["query"],
                "filter": filter_clauses
            }
        }
    
    # Add sorting if specified
    if search_params.sort_by:
        query["sort"] = [{search_params.sort_by: {"order": search_params.sort_order}}]
    
    # Add suggestions
    query["suggest"] = {
        "text": search_params.query,
        "title_suggestions": {
            "term": {
                "field": "title",
                "suggest_mode": "popular",
                "sort": "frequency"
            }
        }
    }
    
    return query

def search(search_params: SearchQuery) -> SearchResponse:
    """Execute search against Elasticsearch"""
    try:
        # Get the Elasticsearch client
        client = get_elasticsearch_client()
        
        # Build the query
        query = _build_elasticsearch_query(search_params)
        
        # Execute the search
        response = client.search(index=settings.es_index, body=query)
        
        # Process results
        hits = response["hits"]["hits"]
        total = response["hits"]["total"]["value"]
        
        # Process suggestions
        suggestions = []
        if "suggest" in response and response["suggest"]["title_suggestions"]:
            for suggestion_list in response["suggest"]["title_suggestions"]:
                for option in suggestion_list["options"]:
                    suggestions.append(option["text"])
        
        # Format results
        results = []
        for hit in hits:
            source = hit["_source"]
            highlights = {}
            
            if "highlight" in hit:
                if "title" in hit["highlight"]:
                    highlights["title"] = hit["highlight"]["title"]
                if "text" in hit["highlight"]:
                    highlights["text"] = hit["highlight"]["text"]
            
            highlight_obj = SearchHighlight(
                title=highlights.get("title"),
                text=highlights.get("text")
            ) if highlights else None
            
            results.append(
                SearchResultItem(
                    id=hit["_id"],
                    title=source.get("title", ""),
                    text=source.get("text", "")[:500],  # Truncate text for preview
                    contributor=source.get("contributor_username", ""),
                    timestamp=source.get("timestamp", ""),
                    score=hit["_score"],
                    highlights=highlight_obj,
                    url=f"https://en.wikipedia.org/wiki/{source.get('title', '').replace(' ', '_')}"
                )
            )
        
        return SearchResponse(
            total=total,
            page=search_params.page,
            page_size=search_params.page_size,
            results=results,
            suggest=suggestions if suggestions else None
        )
        
    # Update the exception handling to use the new exception classes    
    except (ApiError, TransportError) as e:
        logger.error(f"Elasticsearch search error: {str(e)}")
        raise