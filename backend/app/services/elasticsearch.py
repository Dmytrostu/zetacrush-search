from elasticsearch import Elasticsearch, ApiError, TransportError
from app.config import settings
from app.models.search import SearchQuery, SearchResponse, SearchResultItem, SearchHighlight
import logging
import os
import re  # ADD THIS LINE
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
import re  # ADD THIS IMPORT AT THE TOP

def count_sentences(text: str) -> int:
    """Count sentences in text"""
    if not text:
        return 0
    
    # Split by sentence endings and filter out empty strings
    sentences = re.split(r'[.!?]+', text.strip())
    sentences = [s.strip() for s in sentences if s.strip()]
    return len(sentences)

def search(search_params: SearchQuery) -> SearchResponse:
    """Execute search against Elasticsearch"""
    try:
        # Get the Elasticsearch client
        client = get_elasticsearch_client()
        
        # Build the query - GET MORE RESULTS TO FILTER FROM
        query = _build_elasticsearch_query(search_params)
        
        # Increase size to get more results for filtering
        original_size = query["size"]
        query["size"] = min(100, original_size * 10)  # Get 10x more results or 100 max
        
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
        
        # Format ALL results first
        all_results = []
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
            
            # Keep full text for sentence counting
            full_text = source.get("text", "")
            
            all_results.append(
                SearchResultItem(
                    id=hit["_id"],
                    title=source.get("title", ""),
                    text=full_text,  # Keep full text
                    contributor=source.get("contributor_username", ""),
                    timestamp=source.get("timestamp", ""),
                    score=hit["_score"],
                    highlights=highlight_obj,
                    url=f"https://en.wikipedia.org/wiki/{source.get('title', '').replace(' ', '_')}"
                )
            )
        
        # FILTER: Only keep results with 6+ sentences
        filtered_results = []
        for result in all_results:
            sentence_count = count_sentences(result.text)
            if sentence_count >= 6:
                filtered_results.append(result)
        
        # Sort by score (descending) and take top 10
        filtered_results.sort(key=lambda x: x.score, reverse=True)
        final_results = filtered_results[:search_params.page_size]
        
        return SearchResponse(
            total=len(final_results),  # Return filtered count
            page=search_params.page,
            page_size=search_params.page_size,
            results=final_results,
            suggest=suggestions if suggestions else None
        )
        
    # Update the exception handling to use the new exception classes    
    except (ApiError, TransportError) as e:
        logger.error(f"Elasticsearch search error: {str(e)}")
        raise