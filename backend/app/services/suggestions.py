from app.models.suggestions import SuggestionQuery, SuggestionResponse
from app.services.elasticsearch import get_elasticsearch_client
from elasticsearch import Elasticsearch  # Use regular Elasticsearch instead of AsyncElasticsearch
from typing import List, Set
import logging

from app.config import settings

logger = logging.getLogger(__name__)

async def get_suggestions(query: SuggestionQuery) -> SuggestionResponse:
    """
    Get search suggestions based on user input
    
    Args:
        query: SuggestionQuery object with the query and parameters
        
    Returns:
        SuggestionResponse with list of suggestions
    """
    if not query.query or len(query.query.strip()) < 2:
        return SuggestionResponse(
            success=False,
            message="Query must be at least 2 characters long",
            suggestions=[]
        )
    
    try:
        # Get Elasticsearch client
        es_client = get_elasticsearch_client()  # Remove await here
        
        # Try to get suggestions using different methods
        suggestions = _get_elasticsearch_suggestions(es_client, query)  # Remove await here
        
        # If we couldn't get any suggestions from ES, use static fallback
        if not suggestions:
            suggestions = _get_static_suggestions(query.query)
            return SuggestionResponse(
                success=True,
                suggestions=suggestions[:query.max_suggestions],
                is_static=True
            )
            
        return SuggestionResponse(
            success=True,
            suggestions=suggestions[:query.max_suggestions]
        )
        
    except Exception as e:
        logger.error(f"Error getting suggestions: {str(e)}")
        
        # Fallback to static suggestions
        static_suggestions = _get_static_suggestions(query.query)
        return SuggestionResponse(
            success=True,
            suggestions=static_suggestions[:query.max_suggestions],
            is_static=True,
            message="Used fallback suggestions due to an error"
        )

# Remove async from this function
def _get_elasticsearch_suggestions(
    es_client: Elasticsearch, 
    query: SuggestionQuery
) -> List[str]:
    """Get suggestions using Elasticsearch"""
    q = query.query.strip().lower()
    all_suggestions: Set[str] = set()
    index_name = settings.es_index
    
    try:
        # Debug: Check if index exists
        if not es_client.indices.exists(index=index_name):
            logger.error(f"Index {index_name} does not exist")
            return []
        
        # 1. Try a simple search to confirm connectivity
        test_response = es_client.search(
            index=index_name,
            body={
                "size": 1,
                "query": {
                    "match_all": {}
                }
            }
        )
        
        # Debug the test response
        logger.info(f"Test search found {test_response['hits']['total']['value']} documents")
        
        # 2. Try prefix query with explicit index - FIXED aggregation on text field
        # Instead of using aggregations on text field, use only title.keyword
        prefix_response = es_client.search(
            index=index_name,
            body={
                "size": 0,
                "query": {
                    "bool": {
                        "should": [
                            {"prefix": {"title": {"value": q, "boost": 2.0}}},
                            {"match_phrase_prefix": {"text": {"query": q, "slop": 2}}}
                        ]
                    }
                },
                "aggs": {
                    "title_suggestions": {
                        "terms": {
                            "field": "title.keyword",
                            "size": 5
                        }
                    }
                    # Removed the text_terms aggregation that was causing the error
                }
            }
        )
        
        # Extract title suggestions
        if "aggregations" in prefix_response and "title_suggestions" in prefix_response["aggregations"]:
            buckets = prefix_response["aggregations"]["title_suggestions"]["buckets"]
            logger.info(f"Found {len(buckets)} title suggestion buckets")
            
            for bucket in buckets:
                all_suggestions.add(bucket["key"])
        
        # 3. Use a direct search approach for text field matches instead of aggregations
        # This approach doesn't require fielddata
        direct_response = es_client.search(
            index=index_name,
            body={
                "size": 10,
                "query": {
                    "bool": {
                        "should": [
                            {"prefix": {"title": q}},
                            {"match": {"title": {"query": q, "fuzziness": "AUTO"}}},
                            # Add specific queries for the text field that don't require aggregations
                            {"match_phrase_prefix": {"text": {"query": q, "slop": 3}}},
                            {"match": {"text": {"query": q, "fuzziness": "AUTO", "operator": "AND"}}}
                        ]
                    }
                },
                "_source": ["title"]  # Just get the title field
            }
        )
        
        # Extract direct matches
        if "hits" in direct_response and "hits" in direct_response["hits"]:
            hits = direct_response["hits"]["hits"]
            logger.info(f"Direct search found {len(hits)} matching documents")
            
            for hit in hits:
                if "_source" in hit and "title" in hit["_source"]:
                    all_suggestions.add(hit["_source"]["title"])
        
    except Exception as e:
        logger.error(f"Error in Elasticsearch suggestions: {str(e)}", exc_info=True)
    
    # Log the suggestions found
    logger.info(f"Found {len(all_suggestions)} dynamic suggestions from Elasticsearch")
    
    # Add some variations to the suggestions
    variations = [
        f"{q} definition",
        f"{q} examples",
        f"{q} tutorial",
        f"what is {q}"
    ]
    
    for variation in variations:
        all_suggestions.add(variation)
    
    # Filter out suggestions that are identical to the query
    filtered_suggestions = [s for s in all_suggestions if s.lower() != q]
    
    # Sort suggestions (prioritize those that start with the query)
    sorted_suggestions = sorted(
        filtered_suggestions,
        key=lambda s: (0 if s.lower().startswith(q) else 1, len(s))
    )
    
    return sorted_suggestions

def _get_static_suggestions(query: str) -> List[str]:
    """Generate static suggestions based on the query"""
    q = query.strip().lower()
    
    # Some common search variations
    variations = [
        f"{q} definition",
        f"{q} examples",
        f"{q} tutorial",
        f"what is {q}",
        f"{q} guide",
        f"{q} vs",
        f"learn {q}",
        f"{q} best practices"
    ]
    
    # Filter out variations that are identical to the query
    return [v for v in variations if v.lower() != q]