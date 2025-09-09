import os
import xml.etree.ElementTree as ET
from elasticsearch import Elasticsearch, helpers
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

ES_HOST = os.getenv("ES_HOST", "http://localhost:9200")
ES_USER = os.getenv("ES_USER", "")
ES_APIKEY = os.getenv("ES_APIKEY", "")
ES_INDEX = os.getenv("ES_INDEX", "wiki_articles")
XML_FILE_PATH = os.getenv("XML_FILE_PATH", "first_10KB.xml")

def extract_fields(elem):
    # Helper to safely get text
    def get_text(e, path):
        found = elem.find(path)
        return found.text if found is not None else ""
    def get_text_rev(e, path):
        found = e.find(path)
        return found.text if found is not None else ""
    # Main fields
    title = get_text(elem, './{*}title')
    ns = get_text(elem, './{*}ns')
    page_id = get_text(elem, './{*}id')
    redirect_elem = elem.find('./{*}redirect')
    redirect = redirect_elem.attrib.get("title") if redirect_elem is not None else ""
    revision = elem.find('./{*}revision')
    # Revision fields
    rev_id = parentid = timestamp = contributor_username = contributor_id = comment = origin = model = format_ = text = ""
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
            text = text_elem.text if text_elem.text is not None else ""
    return {
        "title": title,
        "ns": ns,
        "id": page_id,
        "redirect": redirect,
        "revision_id": rev_id,
        "parentid": parentid,
        "timestamp": timestamp,
        "contributor_username": contributor_username,
        "contributor_id": contributor_id,
        "comment": comment,
        "origin": origin,
        "model": model,
        "format": format_,
        "text": text
    }

def iter_articles(xml_path):
    try:
        context = ET.iterparse(xml_path, events=("end",))
        for event, elem in context:
            if elem.tag.endswith('page'):
                yield extract_fields(elem)
                elem.clear()
    except ET.ParseError as e:
        print(f"XML ParseError: {e}. File may be truncated, but processed available pages.")

def parse_and_upload_to_es():
    """Parse XML and upload articles to Elasticsearch"""
    
    # Use API key if provided
    es = Elasticsearch(ES_HOST, api_key=ES_APIKEY)
    
    # Check if Elasticsearch is available
    try:
        if not es.ping():
            print(f"Could not connect to Elasticsearch at {ES_HOST}")
            return
        print("Successfully connected to Elasticsearch")
        
        # Check if index exists
        if not es.indices.exists(index=ES_INDEX):
            print(f"WARNING: Index '{ES_INDEX}' does not exist. Please create it first.")
            return
        
    except Exception as e:
        print(f"Error connecting to Elasticsearch: {e}")
        return
    
    # Process and upload in batches
    actions = []
    page_count = 0
    batch_size = 100  # Smaller batch size to avoid memory issues
    
    for article in iter_articles(XML_FILE_PATH):
        # Clean and validate data
        for key, value in article.items():
            if value is None:
                article[key] = ""
                
        actions.append({
            "_index": ES_INDEX,
            "_source": article
        })
        page_count += 1
        
        # Upload in batches
        if len(actions) >= batch_size:
            try:
                success, failed = helpers.bulk(es, actions, stats_only=True, raise_on_error=False)
                print(f"Uploaded batch: {success} successful, {failed} failed")
                actions = []
            except Exception as e:
                print(f"Error uploading batch: {e}")
                # Print the first document to diagnose issues
                if actions:
                    print(f"First document in failed batch: {actions[0]['_source']['title']}")
                actions = []
    
    # Upload any remaining documents
    if actions:
        try:
            success, failed = helpers.bulk(es, actions, stats_only=True, raise_on_error=False)
            print(f"Uploaded final batch: {success} successful, {failed} failed")
        except Exception as e:
            print(f"Error uploading final batch: {e}")
            # Print the first document to diagnose issues
            if actions:
                print(f"First document in failed batch: {actions[0]['_source']['title']}")
    
    print(f"Upload complete. Total pages processed: {page_count}")
    
    # Refresh the index to make documents searchable immediately
    try:
        es.indices.refresh(index=ES_INDEX)
        print(f"Index refreshed. All documents are now searchable.")
    except Exception as e:
        print(f"Error refreshing index: {e}")

if __name__ == "__main__":
    parse_and_upload_to_es()