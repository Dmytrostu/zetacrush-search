import os
import xml.etree.ElementTree as ET
from elasticsearch import Elasticsearch, helpers
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
import logging
from datetime import datetime
import torch

# Setup logging with file output
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('upload.log'),  # Save to file
        logging.StreamHandler()  # Also print to console
    ]
)
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

def get_file_size_gb(file_path):
    """Get file size in GB"""
    try:
        size_bytes = os.path.getsize(file_path)
        size_gb = size_bytes / (1024**3)
        return size_gb
    except Exception as e:
        logger.warning(f"Could not get file size: {e}")
        return 0

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
    if not title or not text or len(text) < 50:
        return None
    
    return {
        "title": title,
        "text": text[:2000] + "..." if len(text) > 2000 else text,
        "title_for_embedding": title,
        "text_for_embedding": text[:1500],
        "timestamp": timestamp,
        "contributor_username": contributor_username[:30] if contributor_username else ""
    }

def create_fast_index(es, index_name):
    """Create SERVERLESS-COMPATIBLE semantic search index"""
    mapping = {
        "mappings": {
            "properties": {
                "title": {
                    "type": "text",
                    "analyzer": "standard"
                },
                "text": {
                    "type": "text",
                    "analyzer": "standard"
                },
                "title_embedding": {
                    "type": "dense_vector",
                    "dims": 384,
                    "index": True,
                    "similarity": "dot_product"
                },
                "text_embedding": {
                    "type": "dense_vector",
                    "dims": 384,
                    "index": True,
                    "similarity": "dot_product"
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
    logger.info(f"Created SERVERLESS semantic index: {index_name}")
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
        batch_size=64,
        normalize_embeddings=True,
        convert_to_tensor=False
    )
    text_embeddings = model.encode(
        texts, 
        show_progress_bar=False, 
        batch_size=64,
        normalize_embeddings=True,
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

def process_articles_fast(xml_path):
    """Process articles WITHOUT counting total first - MUCH FASTER"""
    try:
        context = ET.iterparse(xml_path, events=("end",))
        batch = []
        batch_size = 200
        processed_pages = 0
        
        for event, elem in context:
            if elem.tag.endswith('page'):
                processed_pages += 1
                
                # Log every 1000 pages instead of percentage
                if processed_pages % 1000 == 0:
                    logger.info(f"📊 Processed {processed_pages:,} pages so far...")
                
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
                    elem.clear()
                    continue
        
        # Process remaining articles
        if batch:
            yield process_batch_embeddings(batch)
        
        logger.info(f"📊 Total pages processed: {processed_pages:,}")
            
    except ET.ParseError as e:
        logger.warning(f"XML ParseError: {e}")

def parse_and_upload_fast():
    """MAXIMUM SPEED parse and upload - NO PRE-COUNTING"""
    
    # Connect to Elasticsearch
    es = Elasticsearch(ES_HOST, api_key=ES_APIKEY)
    
    if not es.ping():
        logger.error(f"Could not connect to Elasticsearch at {ES_HOST}")
        return
    
    logger.info("Connected to Elasticsearch Serverless")
    
    # Check file size
    file_size_gb = get_file_size_gb(XML_FILE_PATH)
    logger.info(f"📁 File size: {file_size_gb:.2f} GB")
    
    # Create fast index
    if not create_fast_index(es, ES_INDEX):
        return
    
    # FIXED: Skip total counting for large files
    if file_size_gb > 10:  # Skip counting for files > 10GB
        logger.info(f"⚡ Large file detected ({file_size_gb:.1f}GB). Skipping total count for speed.")
        logger.info("📊 Progress will be shown as: pages processed, docs uploaded, rate")
    
    # Process and upload
    total_uploaded = 0
    total_processed = 0
    start_time = datetime.now()
    
    logger.info(f"🚀 Starting FAST processing from {XML_FILE_PATH}")
    
    for batch_articles in process_articles_fast(XML_FILE_PATH):
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
                chunk_size=200,
                request_timeout=300,
                max_chunk_bytes=100 * 1024 * 1024
            )
            total_uploaded += success
            total_processed += len(actions)
            
            # Log upload progress frequently for large files
            if total_uploaded % 2000 == 0:  # Every 2000 docs
                elapsed = (datetime.now() - start_time).total_seconds()
                rate = total_uploaded / elapsed if elapsed > 0 else 0
                logger.info(f"📤 {total_uploaded:,} docs uploaded | Rate: {rate:.0f} docs/sec | Time: {elapsed/60:.1f}min")
            
        except Exception as e:
            logger.error(f"Error uploading batch: {e}")
    
    # Final results
    elapsed = (datetime.now() - start_time).total_seconds()
    rate = total_uploaded / elapsed if elapsed > 0 else 0
    
    logger.info(f"✅ FAST Upload complete!")
    logger.info(f"✅ Processed: {total_processed:,}")
    logger.info(f"✅ Uploaded: {total_uploaded:,}")
    logger.info(f"✅ Time: {elapsed/60:.1f} minutes")
    logger.info(f"✅ Rate: {rate:.0f} documents/second")
    
    # Refresh and final count
    try:
        es.indices.refresh(index=ES_INDEX)
        final_count = es.count(index=ES_INDEX)["count"]
        logger.info(f"✅ Index contains: {final_count:,} documents")
    except Exception as e:
        logger.warning(f"Could not get final count: {e}")

if __name__ == "__main__":
    parse_and_upload_fast()