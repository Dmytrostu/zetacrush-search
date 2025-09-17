import os
import xml.etree.ElementTree as ET
from elasticsearch import Elasticsearch, helpers
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
import logging
from datetime import datetime
import torch

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

ES_HOST = os.getenv("ES_HOST", "http://localhost:9200")
ES_APIKEY = os.getenv("ES_APIKEY", "")
ES_INDEX = os.getenv("ES_INDEX", "wiki_semantic_fast")
XML_FILE_PATH = os.getenv("XML_FILE_PATH", "first_10KB.xml")

# SPEED: Load embedding model with optimizations
device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = SentenceTransformer('all-MiniLM-L6-v2', device=device)
logger.info(f"Using device: {device}")

def extract_fields(elem):
    """Extract ONLY essential fields - SPEED OPTIMIZED"""
    
    # Helper function
    def get_text(e, path):
        found = e.find(path)
        return found.text if found is not None else ""
    
    # Basic fields
    title = get_text(elem, './{*}title')
    
    # Get text content
    revision = elem.find('./{*}revision')
    text = ""
    timestamp = ""
    contributor_username = ""
    
    if revision is not None:
        text_elem = revision.find('./{*}text')
        if text_elem is not None:
            text = text_elem.text if text_elem.text is not None else ""
        
        timestamp = get_text(revision, './{*}timestamp')
        
        contributor = revision.find('./{*}contributor')
        if contributor is not None:
            contributor_username = get_text(contributor, './{*}username')
    
    # SPEED: Super simple validation
    if not title or not text or len(text) < 50:  # Reduced threshold
        return None
    
    return {
        "title": title,
        "text": text[:2000] + "..." if len(text) > 2000 else text,  # SPEED: Truncate stored text
        "title_for_embedding": title,
        "text_for_embedding": text[:1500],  # SPEED: Shorter embeddings
        "timestamp": timestamp,
        "contributor_username": contributor_username[:30] if contributor_username else ""  # SPEED: Truncate
    }

def create_fast_index(es, index_name):
    """Create SPEED-OPTIMIZED semantic search index"""
    mapping = {
        "settings": {
            "number_of_replicas": 0,  # SPEED: No replicas during upload
            "refresh_interval": "-1"  # SPEED: Disable refresh during upload
        },
        "mappings": {
            "properties": {
                "title": {
                    "type": "text",
                    "analyzer": "standard"  # SPEED: Faster than english
                },
                "text": {
                    "type": "text",
                    "analyzer": "standard"  # SPEED: Faster than english
                },
                "title_embedding": {
                    "type": "dense_vector",
                    "dims": 384,
                    "index": True,
                    "similarity": "dot_product"  # SPEED: Faster than cosine
                },
                "text_embedding": {
                    "type": "dense_vector",
                    "dims": 384,
                    "index": True,
                    "similarity": "dot_product"  # SPEED: Faster than cosine
                },
                "timestamp": {"type": "date"},
                "contributor_username": {"type": "keyword"}
            }
        }
    }
    
    if es.indices.exists(index=index_name):
        logger.info(f"Index '{index_name}' already exists")
        return True
    
    es.indices.create(index=index_name, **mapping)
    logger.info(f"Created FAST semantic index: {index_name}")
    return True

def process_batch_embeddings(articles):
    """Generate embeddings - MAXIMUM SPEED"""
    if not articles:
        return []
    
    # Extract title and text content separately
    titles = [article["title_for_embedding"] for article in articles]
    texts = [article["text_for_embedding"] for article in articles]
    
    # SPEED: Generate embeddings with optimizations
    title_embeddings = model.encode(
        titles, 
        show_progress_bar=False, 
        batch_size=64,  # SPEED: Larger batch
        normalize_embeddings=True,  # SPEED: For dot_product similarity
        convert_to_tensor=False
    )
    text_embeddings = model.encode(
        texts, 
        show_progress_bar=False, 
        batch_size=64,  # SPEED: Larger batch
        normalize_embeddings=True,  # SPEED: For dot_product similarity
        convert_to_tensor=False
    )
    
    # Add embeddings to articles
    for i, article in enumerate(articles):
        article["title_embedding"] = title_embeddings[i].tolist()
        article["text_embedding"] = text_embeddings[i].tolist()
        # Remove the temporary fields
        del article["title_for_embedding"]
        del article["text_for_embedding"]
    
    return articles

def process_articles(xml_path):
    """Process articles in LARGE batches"""
    try:
        context = ET.iterparse(xml_path, events=("end",))
        batch = []
        batch_size = 200  # SPEED: Much larger batches
        
        for event, elem in context:
            if elem.tag.endswith('page'):
                try:
                    article = extract_fields(elem)
                    if article:
                        batch.append(article)
                        
                        # Process batch when full
                        if len(batch) >= batch_size:
                            yield process_batch_embeddings(batch)
                            batch = []
                    
                    elem.clear()  # Free memory
                    
                except Exception as e:
                    # SPEED: Skip logging individual errors
                    elem.clear()
                    continue
        
        # Process remaining articles
        if batch:
            yield process_batch_embeddings(batch)
            
    except ET.ParseError as e:
        logger.warning(f"XML ParseError: {e}")

def parse_and_upload_fast():
    """MAXIMUM SPEED parse and upload"""
    
    # Connect to Elasticsearch
    es = Elasticsearch(ES_HOST, api_key=ES_APIKEY)
    
    if not es.ping():
        logger.error(f"Could not connect to Elasticsearch at {ES_HOST}")
        return
    
    logger.info("Connected to Elasticsearch")
    
    # Create fast index
    if not create_fast_index(es, ES_INDEX):
        return
    
    # Process and upload
    total_uploaded = 0
    total_processed = 0
    start_time = datetime.now()
    
    logger.info(f"Starting FAST processing from {XML_FILE_PATH}")
    
    for batch_articles in process_articles(XML_FILE_PATH):
        if not batch_articles:
            continue
            
        # Prepare for bulk upload
        actions = []
        for article in batch_articles:
            actions.append({
                "_index": ES_INDEX,
                "_source": article
            })
        
        # SPEED: Massive bulk upload
        try:
            success, failed = helpers.bulk(
                es, 
                actions, 
                stats_only=True, 
                raise_on_error=False,
                chunk_size=200,  # SPEED: Much larger chunks
                request_timeout=300,  # SPEED: Longer timeout
                max_chunk_bytes=100 * 1024 * 1024  # SPEED: 100MB chunks
            )
            total_uploaded += success
            total_processed += len(actions)
            
            # SPEED: Log less frequently
            if total_uploaded % 1000 == 0:
                elapsed = (datetime.now() - start_time).total_seconds()
                rate = total_uploaded / elapsed if elapsed > 0 else 0
                logger.info(f"Total uploaded: {total_uploaded}, Rate: {rate:.0f} docs/sec")
            
        except Exception as e:
            logger.error(f"Error uploading batch: {e}")
    
    # SPEED: Re-enable refresh and optimize
    logger.info("Optimizing index for search speed...")
    es.indices.put_settings(
        index=ES_INDEX,
        body={
            "refresh_interval": "1s",
            "number_of_replicas": 0
        }
    )
    
    # SPEED: Force merge for faster search
    es.indices.forcemerge(index=ES_INDEX, max_num_segments=1)
    es.indices.refresh(index=ES_INDEX)
    
    elapsed = (datetime.now() - start_time).total_seconds()
    rate = total_uploaded / elapsed if elapsed > 0 else 0
    
    logger.info(f"✅ FAST Upload complete!")
    logger.info(f"✅ Processed: {total_processed}")
    logger.info(f"✅ Uploaded: {total_uploaded}")
    logger.info(f"✅ Time: {elapsed:.1f} seconds")
    logger.info(f"✅ Rate: {rate:.0f} documents/second")
    
    # Final count
    final_count = es.count(index=ES_INDEX)["count"]
    logger.info(f"✅ Index contains: {final_count} documents")

if __name__ == "__main__":
    parse_and_upload_fast()