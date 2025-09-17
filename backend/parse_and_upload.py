import os
import xml.etree.ElementTree as ET
from elasticsearch import Elasticsearch, helpers
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
import logging
from datetime import datetime
import torch
import numpy as np
from concurrent.futures import ThreadPoolExecutor
import multiprocessing as mp

# Setup logging with file output
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('upload.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

ES_HOST = os.getenv("ES_HOST", "http://localhost:9200")
ES_APIKEY = os.getenv("ES_APIKEY", "")
ES_INDEX = os.getenv("ES_INDEX", "wiki_semantic_fast")
XML_FILE_PATH = os.getenv("XML_FILE_PATH", "first_10KB.xml")

def check_gpu_availability():
    """Comprehensive GPU check with detailed logging"""
    logger.info("🔍 Checking GPU availability...")
    
    # Check CUDA availability
    cuda_available = torch.cuda.is_available()
    logger.info(f"CUDA available: {cuda_available}")
    
    if cuda_available:
        try:
            # Get GPU count
            gpu_count = torch.cuda.device_count()
            logger.info(f"GPU count: {gpu_count}")
            
            # Get current GPU info
            current_device = torch.cuda.current_device()
            gpu_name = torch.cuda.get_device_name(current_device)
            logger.info(f"Current GPU: {current_device} - {gpu_name}")
            
            # Get memory info
            memory_allocated = torch.cuda.memory_allocated(current_device) / 1024**3
            memory_cached = torch.cuda.memory_reserved(current_device) / 1024**3
            memory_total = torch.cuda.get_device_properties(current_device).total_memory / 1024**3
            
            logger.info(f"GPU Memory - Total: {memory_total:.2f}GB, Allocated: {memory_allocated:.2f}GB, Cached: {memory_cached:.2f}GB")
            
            # Test GPU with a simple operation
            test_tensor = torch.randn(100, 100).cuda()
            result = torch.matmul(test_tensor, test_tensor)
            logger.info("✅ GPU test operation successful")
            
            # Clean up test
            del test_tensor, result
            torch.cuda.empty_cache()
            
            return True, 'cuda'
            
        except Exception as e:
            logger.error(f"❌ GPU test failed: {e}")
            logger.warning("🔄 Falling back to CPU")
            return False, 'cpu'
    else:
        logger.warning("❌ CUDA not available")
        logger.info("Possible reasons:")
        logger.info("  - No NVIDIA GPU detected")
        logger.info("  - CUDA drivers not installed")
        logger.info("  - PyTorch not compiled with CUDA support")
        logger.info("🔄 Using CPU")
        return False, 'cpu'

def initialize_model_with_gpu_check():
    """Initialize model with GPU diagnostics"""
    logger.info("🤖 Initializing SentenceTransformer model...")
    
    # Check GPU first
    gpu_works, device = check_gpu_availability()
    
    try:
        # Load model
        model = SentenceTransformer('all-MiniLM-L6-v2', device=device)
        logger.info(f"✅ Model loaded on: {device}")
        
        # Try FP16 optimization for GPU
        fp16_enabled = False
        if gpu_works and device == 'cuda':
            try:
                model.half()  # Use FP16 for 2x speed on GPU
                fp16_enabled = True
                logger.info("✅ FP16 optimization enabled (2x speed boost)")
            except Exception as e:
                logger.warning(f"⚠️ FP16 optimization failed: {e}")
                logger.info("🔄 Continuing with FP32")
        
        # Test model with a sample
        test_text = ["This is a test sentence"]
        test_embedding = model.encode(test_text, show_progress_bar=False)
        logger.info(f"✅ Model test successful - embedding shape: {test_embedding.shape}")
        
        return model, device, fp16_enabled
        
    except Exception as e:
        logger.error(f"❌ Model initialization failed: {e}")
        raise

# SPEED: Initialize model ONCE with comprehensive GPU checking
model, device, fp16_enabled = initialize_model_with_gpu_check()

def get_file_size_gb(file_path):
    """Get file size in GB"""
    try:
        size_bytes = os.path.getsize(file_path)
        size_gb = size_bytes / (1024**3)
        return size_gb
    except Exception as e:
        logger.warning(f"Could not get file size: {e}")
        return 0

def extract_fields_fast(elem):
    """ULTRA-FAST field extraction - minimal processing"""
    
    # Get title directly
    title_elem = elem.find('./{*}title')
    if title_elem is None or not title_elem.text:
        return None
    title = title_elem.text.strip()
    
    # Get text from revision
    revision = elem.find('./{*}revision')
    if revision is None:
        return None
        
    text_elem = revision.find('./{*}text')
    if text_elem is None or not text_elem.text:
        return None
    text = text_elem.text
    
    # SPEED: Ultra-simple validation
    if len(text) < 50 or len(title) < 2:
        return None
    
    # SPEED: Get only timestamp, skip contributor
    timestamp_elem = revision.find('./{*}timestamp')
    timestamp = timestamp_elem.text if timestamp_elem is not None else ""
    
    return {
        "title": title,
        "text": text[:1000] + "..." if len(text) > 1000 else text,  # MUCH shorter storage
        "title_for_embedding": title,
        "text_for_embedding": text[:800],  # MUCH shorter embeddings
        "timestamp": timestamp
    }

def create_ultra_fast_index(es, index_name):
    """Create ULTRA-FAST semantic search index"""
    mapping = {
        "mappings": {
            "properties": {
                "title": {
                    "type": "text",
                    "analyzer": "keyword"  # SPEED: No analysis
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
                "timestamp": {"type": "date"}
            }
        }
    }
    
    if es.indices.exists(index=index_name):
        logger.info(f"Index '{index_name}' already exists")
        return True
    
    es.indices.create(index=index_name, **mapping)
    logger.info(f"Created ULTRA-FAST semantic index: {index_name}")
    return True

def process_mega_batch_embeddings(articles):
    """Generate embeddings for MEGA batches - MAXIMUM SPEED with GPU monitoring"""
    if not articles:
        return []
    
    # Extract content in one go
    titles = [article["title_for_embedding"] for article in articles]
    texts = [article["text_for_embedding"] for article in articles]
    
    # Determine optimal batch size based on device
    optimal_batch_size = 128 if device == 'cuda' else 64
    
    # SPEED: Generate embeddings with device-optimized batches
    try:
        # Monitor GPU memory if available
        if device == 'cuda':
            memory_before = torch.cuda.memory_allocated() / 1024**3
        
        title_embeddings = model.encode(
            titles, 
            show_progress_bar=False, 
            batch_size=optimal_batch_size,
            normalize_embeddings=True,
            convert_to_tensor=False,
            device=device
        )
        text_embeddings = model.encode(
            texts, 
            show_progress_bar=False, 
            batch_size=optimal_batch_size,
            normalize_embeddings=True,
            convert_to_tensor=False,
            device=device
        )
        
        # Monitor GPU memory usage
        if device == 'cuda':
            memory_after = torch.cuda.memory_allocated() / 1024**3
            memory_used = memory_after - memory_before
            if memory_used > 1.0:  # Log if using > 1GB
                logger.debug(f"GPU memory used for batch: {memory_used:.2f}GB")
        
        # Add embeddings to articles
        for i, article in enumerate(articles):
            article["title_embedding"] = title_embeddings[i].tolist()
            article["text_embedding"] = text_embeddings[i].tolist()
            # Remove temporary fields
            del article["title_for_embedding"]
            del article["text_for_embedding"]
        
        # Clean up GPU memory if needed
        if device == 'cuda':
            torch.cuda.empty_cache()
        
        return articles
        
    except Exception as e:
        logger.error(f"❌ Error in embedding generation: {e}")
        
        # If GPU error, provide helpful debugging info
        if device == 'cuda':
            try:
                memory_info = torch.cuda.memory_summary()
                logger.error(f"GPU Memory Summary:\n{memory_info}")
            except:
                pass
        
        return []

def process_articles_ultra_fast(xml_path):
    """Process articles with MASSIVE batches - NO bottlenecks"""
    try:
        context = ET.iterparse(xml_path, events=("end",))
        batch = []
        batch_size = 1000  # MASSIVE batches - 5x larger
        processed_pages = 0
        
        for event, elem in context:
            if elem.tag.endswith('page'):
                processed_pages += 1
                
                # Log every 5000 pages
                if processed_pages % 5000 == 0:
                    logger.info(f"📊 Processed {processed_pages:,} pages...")
                
                try:
                    article = extract_fields_fast(elem)
                    if article:
                        batch.append(article)
                        
                        # Process MEGA batch when full
                        if len(batch) >= batch_size:
                            result = process_mega_batch_embeddings(batch)
                            if result:  # Only yield if successful
                                yield result
                            batch = []
                    
                    elem.clear()  # Free memory immediately
                    
                except Exception as e:
                    elem.clear()
                    continue
        
        # Process remaining articles
        if batch:
            result = process_mega_batch_embeddings(batch)
            if result:
                yield result
        
        logger.info(f"📊 Total pages processed: {processed_pages:,}")
            
    except ET.ParseError as e:
        logger.warning(f"XML ParseError: {e}")

def parse_and_upload_ultra_fast():
    """ULTRA-FAST parse and upload - MAXIMUM SPEED"""
    
    # Connect to Elasticsearch
    es = Elasticsearch(ES_HOST, api_key=ES_APIKEY)
    
    if not es.ping():
        logger.error(f"Could not connect to Elasticsearch at {ES_HOST}")
        return
    
    logger.info("Connected to Elasticsearch Serverless")
    
    # Check file size
    file_size_gb = get_file_size_gb(XML_FILE_PATH)
    logger.info(f"📁 File size: {file_size_gb:.2f} GB")
    
    # Create ultra-fast index
    if not create_ultra_fast_index(es, ES_INDEX):
        return
    
    # Log system configuration
    logger.info(f"🚀 System Configuration:")
    logger.info(f"   Device: {device}")
    logger.info(f"   FP16: {fp16_enabled}")
    logger.info(f"   Batch size: 1000")
    logger.info(f"   Chunk size: 500")
    logger.info(f"   Expected speed: {'500-2000 docs/sec' if device == 'cuda' else '50-200 docs/sec'}")
    
    # Process and upload with MAXIMUM settings
    total_uploaded = 0
    total_processed = 0
    start_time = datetime.now()
    
    logger.info(f"🚀 Starting ULTRA-FAST processing from {XML_FILE_PATH}")
    
    for batch_articles in process_articles_ultra_fast(XML_FILE_PATH):
        if not batch_articles:
            continue
            
        # Prepare for MASSIVE bulk upload
        actions = []
        for article in batch_articles:
            actions.append({
                "_index": ES_INDEX,
                "_source": article
            })
        
        # SPEED: MASSIVE bulk upload with maximum settings
        try:
            success, failed = helpers.bulk(
                es, 
                actions, 
                stats_only=True, 
                raise_on_error=False,
                chunk_size=500,  # MASSIVE chunks
                request_timeout=600,  # 10 minutes timeout
                max_chunk_bytes=200 * 1024 * 1024,  # 200MB chunks
                max_retries=0  # No retries for speed
            )
            total_uploaded += success
            total_processed += len(actions)
            
            # Log progress every 10000 docs
            if total_uploaded % 10000 == 0 and total_uploaded > 0:
                elapsed = (datetime.now() - start_time).total_seconds()
                rate = total_uploaded / elapsed if elapsed > 0 else 0
                eta_hours = (20_000_000 - total_uploaded) / rate / 3600 if rate > 0 else 0
                logger.info(f"📤 {total_uploaded:,} docs | Rate: {rate:.0f}/sec | ETA: {eta_hours:.1f}h | Time: {elapsed/60:.1f}min | Device: {device}")
            
        except Exception as e:
            logger.error(f"Error uploading batch: {e}")
    
    # Final results
    elapsed = (datetime.now() - start_time).total_seconds()
    rate = total_uploaded / elapsed if elapsed > 0 else 0
    
    logger.info(f"✅ ULTRA-FAST Upload complete!")
    logger.info(f"✅ Device used: {device} (FP16: {fp16_enabled})")
    logger.info(f"✅ Processed: {total_processed:,}")
    logger.info(f"✅ Uploaded: {total_uploaded:,}")
    logger.info(f"✅ Time: {elapsed/60:.1f} minutes ({elapsed/3600:.2f} hours)")
    logger.info(f"✅ Rate: {rate:.0f} documents/second")
    
    # GPU summary if used
    if device == 'cuda':
        try:
            final_memory = torch.cuda.memory_allocated() / 1024**3
            logger.info(f"✅ Final GPU memory: {final_memory:.2f}GB")
        except:
            pass
    
    # Quick refresh
    try:
        es.indices.refresh(index=ES_INDEX)
        final_count = es.count(index=ES_INDEX)["count"]
        logger.info(f"✅ Index contains: {final_count:,} documents")
    except Exception as e:
        logger.warning(f"Could not get final count: {e}")

if __name__ == "__main__":
    parse_and_upload_ultra_fast()