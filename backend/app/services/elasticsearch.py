from elasticsearch import AsyncElasticsearch
# Replace this line:
# from elasticsearch.exceptions import ElasticsearchException
# With this:
from elasticsearch import ApiError, TransportError  # Use the new exception classes
from app.config import settings
from app.models.search import SearchQuery, SearchResponse, SearchResultItem, SearchHighlight
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Configure Elasticsearch client
es_config = {}
if settings.es_apikey:
    es_config["api_key"] = settings.es_apikey
elif settings.es_user and settings.es_password:
    es_config["basic_auth"] = (settings.es_user, settings.es_password)

es = AsyncElasticsearch(settings.es_host, **es_config)

async def check_connection() -> bool:
    """Check if Elasticsearch connection is successful"""
    try:
        return await es.ping()
    except Exception as e:
        logger.error(f"Elasticsearch connection error: {str(e)}")
        return False

async def build_search_query(search_params: SearchQuery) -> Dict[str, Any]:
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

async def search(search_params: SearchQuery) -> SearchResponse:
    """Execute search against Elasticsearch"""
    try:
        query = await build_search_query(search_params)
        response = await es.search(index=settings.es_index, body=query)
        
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
                    highlights=highlight_obj
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