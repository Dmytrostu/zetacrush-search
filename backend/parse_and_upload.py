import os
import re
import xml.etree.ElementTree as ET
from elasticsearch import Elasticsearch, helpers
from dotenv import load_dotenv
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

ES_HOST = os.getenv("ES_HOST", "http://localhost:9200")
ES_USER = os.getenv("ES_USER", "")
ES_APIKEY = os.getenv("ES_APIKEY", "")
ES_INDEX = os.getenv("ES_INDEX", "wiki_articles")
XML_FILE_PATH = os.getenv("XML_FILE_PATH", "first_10KB.xml")

class TextProcessor:
    """Advanced text processing for better semantic search"""
    
    @staticmethod
    def clean_mediawiki_text(text: str) -> str:
        """Clean MediaWiki markup for better indexing"""
        if not text:
            return ""
        
        # Remove citation templates
        text = re.sub(r'\{\{Cite[^}]+\}\}', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\{\{cite[^}]+\}\}', '', text, flags=re.IGNORECASE)
        
        # Remove all other templates
        text = re.sub(r'\{\{[^}]+\}\}', '', text)
        
        # Remove references
        text = re.sub(r'<ref.*?>.*?</ref>', '', text, flags=re.DOTALL)
        text = re.sub(r'<ref[^>]*?/>', '', text)
        text = re.sub(r'\[\d+\]', '', text)
        
        # Handle internal links - keep display text
        text = re.sub(r'\[\[([^|]+)\|([^\]]+)\]\]', r'\2', text)
        text = re.sub(r'\[\[([^\]]+)\]\]', r'\1', text)
        
        # Remove external links
        text = re.sub(r'\[http[^\]]+\]', '', text)
        text = re.sub(r'\[(https?://[^\s\]]+)([^\]]*)\]', r'\2', text)
        
        # Remove tables
        text = re.sub(r'\{\|[\s\S]*?\|\}', '', text)
        
        # Remove file/image references
        text = re.sub(r'\[\[File:[^\]]+\]\]', '', text)
        text = re.sub(r'\[\[Image:[^\]]+\]\]', '', text)
        
        # Clean markup
        text = re.sub(r"'''(.*?)'''", r'\1', text)  # Bold
        text = re.sub(r"''(.*?)''", r'\1', text)    # Italic
        text = re.sub(r'===+([^=]+)===+', r'\1', text)  # Headers
        text = re.sub(r'==([^=]+)==', r'\1', text)      # Headers
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        return text
    
    @staticmethod
    def extract_keywords(text: str, title: str) -> List[str]:
        """Extract important keywords for semantic search"""
        keywords = set()
        
        # Add title words
        title_words = re.findall(r'\b[A-Za-z]{3,}\b', title.lower())
        keywords.update(title_words)
        
        # Extract capitalized words (likely proper nouns)
        proper_nouns = re.findall(r'\b[A-Z][a-z]{2,}\b', text)
        keywords.update([word.lower() for word in proper_nouns])
        
        # Extract words that appear frequently
        words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
        word_freq = {}
        for word in words:
            word_freq[word] = word_freq.get(word, 0) + 1
        
        # Add words that appear more than once
        frequent_words = [word for word, freq in word_freq.items() if freq > 1]
        keywords.update(frequent_words[:20])  # Limit to top 20
        
        return list(keywords)
    
    @staticmethod
    def count_sentences(text: str) -> int:
        """Count sentences in text for quality filtering"""
        if not text:
            return 0
        sentences = re.split(r'[.!?]+', text.strip())
        sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 10]
        return len(sentences)
    
    @staticmethod
    def extract_summary(text: str, max_length: int = 500) -> str:
        """Extract a meaningful summary from the beginning of the text"""
        if not text:
            return ""
        
        # Split into sentences
        sentences = re.split(r'[.!?]+', text)
        summary_sentences = []
        current_length = 0
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            # Skip sentences that are too short or look like markup
            if len(sentence) < 20:
                continue
            if re.match(r'^[A-Z_]+\s*[:=]', sentence):  # Code-like
                continue
            if re.match(r'^\d+\s*[.:]\s*', sentence):   # Numbered lists
                continue
            
            if current_length + len(sentence) > max_length:
                break
                
            summary_sentences.append(sentence)
            current_length += len(sentence)
        
        return '. '.join(summary_sentences) + '.' if summary_sentences else text[:max_length]

def extract_fields(elem) -> Dict[str, Any]:
    """Extract and process fields from XML element"""
    processor = TextProcessor()
    
    # Helper functions
    def get_text(e, path):
        found = e.find(path)
        return found.text if found is not None else ""
    
    def get_text_rev(e, path):
        found = e.find(path)
        return found.text if found is not None else ""
    
    # Extract basic fields
    title = get_text(elem, './{*}title')
    ns = get_text(elem, './{*}ns')
    page_id = get_text(elem, './{*}id')
    redirect_elem = elem.find('./{*}redirect')
    redirect = redirect_elem.attrib.get("title") if redirect_elem is not None else ""
    
    # Extract revision data
    revision = elem.find('./{*}revision')
    rev_id = parentid = timestamp = contributor_username = contributor_id = ""
    comment = origin = model = format_ = raw_text = ""
    
    if revision is not None:
        rev_id = get_text_rev(revision, './{*}id')
        parentid = get_text_rev(revision, './{*}parentid')
        timestamp = get_text_rev(revision, './{*}timestamp')
        
        contributor = revision.find('./{*}contributor')
        if contributor is not None:
            contributor_username = get_text_rev(contributor, './{*}username')
            contributor_id = get_text_rev(contributor, './{*}id')
        
        comment = get_text_rev(revision, './{*}comment')
        origin = get_text_rev(revision, './{*}origin')
        model = get_text_rev(revision, './{*}model')
        format_ = get_text_rev(revision, './{*}format')
        
        text_elem = revision.find('./{*}text')
        if text_elem is not None:
            raw_text = text_elem.text if text_elem.text is not None else ""
    
    # Process text for better search
    cleaned_text = processor.clean_mediawiki_text(raw_text)
    sentence_count = processor.count_sentences(cleaned_text)
    keywords = processor.extract_keywords(cleaned_text, title)
    summary = processor.extract_summary(cleaned_text)
    
    # Calculate content quality score
    quality_score = min(10, max(1, sentence_count / 2))  # 1-10 scale
    
    # Determine content type
    content_type = "article"
    if ns == "1":
        content_type = "talk"
    elif ns == "6":
        content_type = "file"
    elif ns == "14":
        content_type = "category"
    elif redirect:
        content_type = "redirect"
    
    return {
        # Basic metadata
        "title": title,
        "ns": ns,
        "id": page_id,
        "redirect": redirect,
        "content_type": content_type,
        
        # Revision metadata
        "revision_id": rev_id,
        "parentid": parentid,
        "timestamp": timestamp,
        "contributor_username": contributor_username,
        "contributor_id": contributor_id,
        "comment": comment,
        "origin": origin,
        "model": model,
        "format": format_,
        
        # Processed content for search
        "text": cleaned_text,
        "raw_text": raw_text,
        "summary": summary,
        "keywords": keywords,
        "sentence_count": sentence_count,
        "quality_score": quality_score,
        "text_length": len(cleaned_text),
        
        # Search optimization fields
        "title_keywords": title.lower().split(),
        "has_content": len(cleaned_text) > 100,
        "is_substantial": sentence_count >= 6,
        
        # Indexing metadata
        "indexed_at": datetime.utcnow().isoformat(),
        "url": f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}" if title else ""
    }

def create_index_mapping(es: Elasticsearch, index_name: str) -> bool:
    """Create optimized index mapping for semantic search"""
    mapping = {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0,
            "analysis": {
                "analyzer": {
                    "semantic_analyzer": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": [
                            "lowercase",
                            "stop",
                            "snowball",
                            "asciifolding"
                        ]
                    },
                    "keyword_analyzer": {
                        "type": "custom",
                        "tokenizer": "keyword",
                        "filter": ["lowercase", "trim"]
                    }
                }
            }
        },
        "mappings": {
            "properties": {
                # Core content fields
                "title": {
                    "type": "text",
                    "analyzer": "semantic_analyzer",
                    "fields": {
                        "exact": {"type": "keyword"},
                        "suggest": {"type": "completion"}
                    },
                    "boost": 3.0
                },
                "text": {
                    "type": "text", 
                    "analyzer": "semantic_analyzer",
                    "term_vector": "with_positions_offsets"
                },
                "summary": {
                    "type": "text",
                    "analyzer": "semantic_analyzer",
                    "boost": 2.0
                },
                "keywords": {
                    "type": "keyword",
                    "boost": 1.5
                },
                "title_keywords": {
                    "type": "keyword"
                },
                
                # Metadata fields
                "ns": {"type": "keyword"},
                "id": {"type": "keyword"},
                "content_type": {"type": "keyword"},
                "quality_score": {"type": "float"},
                "sentence_count": {"type": "integer"},
                "text_length": {"type": "integer"},
                "has_content": {"type": "boolean"},
                "is_substantial": {"type": "boolean"},
                
                # Revision fields
                "revision_id": {"type": "keyword"},
                "timestamp": {"type": "date"},
                "contributor_username": {"type": "keyword"},
                "contributor_id": {"type": "keyword"},
                
                # Search optimization
                "url": {"type": "keyword"},
                "indexed_at": {"type": "date"},
                
                # Raw content (not analyzed)
                "raw_text": {"type": "text", "index": False}
            }
        }
    }
    
    try:
        if es.indices.exists(index=index_name):
            logger.info(f"Index '{index_name}' already exists")
            return True
        
        es.indices.create(index=index_name, body=mapping)
        logger.info(f"Created index '{index_name}' with optimized mapping")
        return True
    except Exception as e:
        logger.error(f"Error creating index: {e}")
        return False

def iter_articles(xml_path: str):
    """Iterate through XML articles with better error handling"""
    try:
        context = ET.iterparse(xml_path, events=("end",))
        processed_count = 0
        
        for event, elem in context:
            if elem.tag.endswith('page'):
                try:
                    article = extract_fields(elem)
                    
                    # Filter out low-quality content
                    if (article['has_content'] and 
                        article['content_type'] == 'article' and 
                        not article['redirect']):
                        yield article
                        processed_count += 1
                        
                        if processed_count % 100 == 0:
                            logger.info(f"Processed {processed_count} articles...")
                    
                    elem.clear()  # Free memory
                    
                except Exception as e:
                    logger.warning(f"Error processing article: {e}")
                    elem.clear()
                    continue
                    
    except ET.ParseError as e:
        logger.warning(f"XML ParseError: {e}. Processing available pages...")

def parse_and_upload_to_es():
    """Parse XML and upload articles to Elasticsearch with advanced indexing"""
    
    # Connect to Elasticsearch
    es = Elasticsearch(ES_HOST, api_key=ES_APIKEY)
    
    try:
        if not es.ping():
            logger.error(f"Could not connect to Elasticsearch at {ES_HOST}")
            return
        logger.info("Successfully connected to Elasticsearch")
        
        # Create optimized index
        if not create_index_mapping(es, ES_INDEX):
            logger.error("Failed to create index mapping")
            return
        
    except Exception as e:
        logger.error(f"Error connecting to Elasticsearch: {e}")
        return
    
    # Process and upload in batches
    actions = []
    page_count = 0
    successful_uploads = 0
    batch_size = 50  # Smaller batches for complex documents
    
    logger.info(f"Starting to process articles from {XML_FILE_PATH}")
    
    for article in iter_articles(XML_FILE_PATH):
        # Ensure all fields have valid values
        for key, value in article.items():
            if value is None:
                article[key] = "" if isinstance(value, str) else 0
        
        actions.append({
            "_index": ES_INDEX,
            "_source": article
        })
        page_count += 1
        
        # Upload in batches
        if len(actions) >= batch_size:
            try:
                success, failed = helpers.bulk(
                    es, 
                    actions, 
                    stats_only=True, 
                    raise_on_error=False,
                    timeout='60s',
                    max_retries=3
                )
                successful_uploads += success
                logger.info(f"Batch uploaded: {success} successful, {failed} failed. Total: {successful_uploads}")
                actions = []
                
            except Exception as e:
                logger.error(f"Error uploading batch: {e}")
                if actions:
                    logger.error(f"First document in failed batch: {actions[0]['_source']['title']}")
                actions = []
    
    # Upload remaining documents
    if actions:
        try:
            success, failed = helpers.bulk(
                es, 
                actions, 
                stats_only=True, 
                raise_on_error=False,
                timeout='60s'
            )
            successful_uploads += success
            logger.info(f"Final batch: {success} successful, {failed} failed")
        except Exception as e:
            logger.error(f"Error uploading final batch: {e}")
    
    logger.info(f"Upload complete. Total processed: {page_count}, Successfully uploaded: {successful_uploads}")
    
    # Refresh index
    try:
        es.indices.refresh(index=ES_INDEX)
        logger.info("Index refreshed. All documents are now searchable.")
        
        # Print index stats
        stats = es.indices.stats(index=ES_INDEX)
        doc_count = stats['indices'][ES_INDEX]['total']['docs']['count']
        logger.info(f"Index now contains {doc_count} documents")
        
    except Exception as e:
        logger.error(f"Error refreshing index: {e}")

if __name__ == "__main__":
    parse_and_upload_to_es()