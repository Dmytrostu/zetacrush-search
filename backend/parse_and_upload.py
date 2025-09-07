import xml.etree.ElementTree as ET

def iter_articles(xml_path):
    # Use iterparse for streaming large files
    context = ET.iterparse(xml_path, events=("end",))
    for event, elem in context:
        if elem.tag.endswith('page'):
            # Extract fields safely
            title = elem.find('./{*}title')
            ns = elem.find('./{*}ns')
            page_id = elem.find('./{*}id')
            revision = elem.find('./{*}revision')
            redirect = elem.find('./{*}redirect')
            # Defaults
            article = {
                "title": title.text if title is not None else "",
                "ns": ns.text if ns is not None else "",
                "id": page_id.text if page_id is not None else "",
                "redirect": redirect.attrib.get("title") if redirect is not None else None,
                "timestamp": "",
                "contributor": "",
                "format": "",
                "text": "",
            }
            if revision is not None:
                ts = revision.find('./{*}timestamp')
                contributor = revision.find('./{*}contributor/{*}username')
                format_ = revision.find('./{*}format')
                text = revision.find('./{*}text')
                article["timestamp"] = ts.text if ts is not None else ""
                article["contributor"] = contributor.text if contributor is not None else ""
                article["format"] = format_.text if format_ is not None else ""
                article["text"] = text.text if text is not None else ""
            yield article
            elem.clear()  # Free memory

if __name__ == "__main__":
    xml_file = "first_10KB.xml"  # Change to your large file path
    for article in iter_articles(xml_file):
        print(article)