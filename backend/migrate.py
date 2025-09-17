from sentence_transformers import SentenceTransformer
from elasticsearch import Elasticsearch, helpers
import os
import time
import logging
from tqdm import tqdm
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Load embedding model
model = SentenceTransformer('all-MiniLM-L6-v2')  # 384 dims

ES_HOST = os.getenv("ES_HOST", "http://localhost:9200")
ES_APIKEY = os.getenv("ES_APIKEY", "")

# Connect to Elasticsearch
es = Elasticsearch(ES_HOST, api_key=ES_APIKEY)

# Define the semantic index mapping
SEMANTIC_INDEX = "wikipedia-semantic-fast"
SOURCE_INDEX = "search-zeta-mvp"

# SPEED-OPTIMIZED: Minimal mapping with only essential fields
SEMANTIC_MAPPING = {
    "mappings": {
        "properties": {
            # Only essential text fields
            "title": {
                "type": "text",
                "analyzer": "english"
            },
            "text": {
                "type": "text", 
                "analyzer": "english"
            },
            
            # Only one embedding for speed
            "content_embedding": {
                "type": "dense_vector", 
                "dims": 384,
                "index": True,
                "similarity": "cosine"
            },
            
            # Minimal metadata
            "timestamp": {"type": "date"},
            "contributor_username": {"type": "keyword"}
        }
    }
}

def create_semantic_index():
    """Create the semantic index with minimal mapping"""
    if es.indices.exists(index=SEMANTIC_INDEX):
        logger.warning(f"Index {SEMANTIC_INDEX} already exists. Delete it first if you want to recreate.")
        return False
    
    es.indices.create(index=SEMANTIC_INDEX, **SEMANTIC_MAPPING)
    logger.info(f"Created index {SEMANTIC_INDEX}")
    return True

def count_docs(index):
    """Get total document count"""
    return es.count(index=index)["count"]

def generate_semantic_docs(source_index, batch_size=1000):  # EVEN BIGGER
    """Generate documents with embeddings - MAXIMUM SPEED"""
    # Get total count for progress bar
    total = count_docs(source_index)
    logger.info(f"Total documents to process: {total}")
    
    # Initialize progress bar
    pbar = tqdm(total=total, desc="Processing documents")
    
    # SPEED: Simple query, no complex filtering
    page = es.search(
        index=source_index,
        scroll='15m',
        size=batch_size,  # MASSIVE batches
        _source=["title", "text", "timestamp", "contributor_username"],
        body={
            "query": {
                "bool": {
                    "must": [
                        {"exists": {"field": "title"}},
                        {"exists": {"field": "text"}}
                    ]
                }
            }
        }
    )
    
    sid = page['_scroll_id']
    scroll_size = len(page['hits']['hits'])
    
    while scroll_size > 0:
        batch_texts = []
        batch_docs = []
        
        # Collect batch for encoding
        for doc in page['hits']['hits']:
            src = doc['_source']
            
            title = src.get("title", "").strip()
            text = src.get("text", "").strip()
            
            # SPEED: Even simpler validation
            if not title or not text or len(text) < 100:
                continue
                
            # SPEED: Shorter content for faster embedding
            content_for_embedding = f"{title}. {text[:1500]}"
            
            batch_texts.append(content_for_embedding)
            batch_docs.append((doc["_id"], src, title, text))
        
        # Batch encode for efficiency
        if batch_texts:
            try:
                # SPEED: Process in mega-batches
                content_embeddings = model.encode(
                    batch_texts, 
                    show_progress_bar=False,
                    batch_size=64,  # Even bigger model batch
                    normalize_embeddings=True
                )
                
                # Yield documents with minimal data
                for i, (doc_id, src, title, text) in enumerate(batch_docs):
                    yield {
                        "_index": SEMANTIC_INDEX,
                        "_id": doc_id,
                        "_source": {
                            "title": title,
                            "text": text[:500] + "..." if len(text) > 500 else text,
                            "content_embedding": content_embeddings[i].tolist(),
                            "timestamp": src.get("timestamp"),
                            "contributor_username": src.get("contributor_username", "")[:50]
                        }
                    }
                
                pbar.update(len(batch_docs))
                
            except Exception as e:
                logger.error(f"Error encoding batch: {e}")
                pbar.update(len(batch_docs))
                continue
        else:
            pbar.update(len(page['hits']['hits']))
        
        # Get next page
        try:
            page = es.scroll(scroll_id=sid, scroll='15m')
            sid = page['_scroll_id']
            scroll_size = len(page['hits']['hits'])
        except Exception as e:
            logger.error(f"Error scrolling: {e}")
            break
    
    pbar.close()

if __name__ == "__main__":
    start = time.time()
    
    # Create the semantic index
    if create_semantic_index():
        try:
            # FIXED: Removed invalid parameters
            success_count = 0
            error_count = 0
            
            for ok, result in helpers.streaming_bulk(
                es, 
                generate_semantic_docs(SOURCE_INDEX),
                chunk_size=1000,  # MASSIVE chunks
                max_retries=0,    # No retries for speed
                raise_on_error=False,
                request_timeout=300,  # 5 minutes
                max_chunk_bytes=200 * 1024 * 1024  # 200MB chunks - HUGE
            ):
                if ok:
                    success_count += 1
                else:
                    error_count += 1
                    # Only log first 3 errors
                    if error_count <= 3:
                        logger.error(f"Failed to index document: {result}")
                
                # Log progress every 10000 documents
                if (success_count + error_count) % 10000 == 0:
                    elapsed = time.time() - start
                    rate = (success_count + error_count) / elapsed
                    eta_seconds = (6332600 - (success_count + error_count)) / rate if rate > 0 else 0
                    eta_hours = eta_seconds / 3600
                    logger.info(f"Processed: {success_count} success, {error_count} errors. Rate: {rate:.0f} docs/sec. ETA: {eta_hours:.1f}h")
            
            logger.info(f"Successfully indexed {success_count} documents")
            logger.info(f"Failed to index {error_count} documents")
            
            # Final stats
            final_count = count_docs(SEMANTIC_INDEX)
            total_time = time.time() - start
            rate = success_count / total_time if total_time > 0 else 0
            logger.info(f"✅ Migration complete! {final_count} documents in semantic index")
            logger.info(f"✅ Total time: {round(total_time, 2)} seconds")
            logger.info(f"✅ Average rate: {rate:.0f} documents/second")
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            raise
    else:
        logger.error("Could not create semantic index")