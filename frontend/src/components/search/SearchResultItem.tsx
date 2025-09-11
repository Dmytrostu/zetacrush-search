import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { SearchResult } from '../../context/SearchContext';

interface SearchResultItemProps {
  result: SearchResult;
}

// Enhanced helper function to transform MediaWiki text to HTML
const parseMediaWikiText = (text: string): string => {
  try {
    // Basic transformations for common MediaWiki syntax
    let html = text;
    
    // Handle citation templates
    html = html.replace(/\{\{Cite web\|url = ([^|]+)\|date=([^|]+)\|access-date=([^|]+)\|publisher=([^|]+)\|first=([^|]+)\|last=([^|]+)\|website=([^|]+)\}\}/gi, 
      '<span class="citation">[Source: $4, $2]</span>');
    
    // Handle simpler citation format
    html = html.replace(/\{\{Cite web\|url = ([^}]+)\}\}/gi, 
      '<span class="citation">[Web citation]</span>');
    
    // Handle other citation formats
    html = html.replace(/\{\{cite[^}]+\}\}/gi, '<span class="citation">[Citation]</span>');
    
    // Handle highlighted content from search results
    html = html.replace(/<mark>(.*?)<\/mark>/g, '<span class="highlight">$1</span>');
    
    // Clean up citation/reference templates with pipe syntax
    html = html.replace(/\{\{[^}]+\|[^}]+\}\}/g, '');
    
    // Clean up other templates
    html = html.replace(/\{\{[^}]+\}\}/g, '');
    
    // Handle bold and italic
    html = html.replace(/'''(.*?)'''/g, '<strong>$1</strong>');
    html = html.replace(/''(.*?)''/g, '<em>$1</em>');
    
    // Handle headings (limit to h4-h6 as the component already has main heading)
    html = html.replace(/=====(.*?)=====/g, '<h6>$1</h6>');
    html = html.replace(/====(.*?)====/g, '<h5>$1</h5>');
    html = html.replace(/===(.*?)===/g, '<h4>$1</h4>');
    
    // Handle lists
    const bulletListRegex = /^\* (.*?)$/gm;
    html = html.replace(bulletListRegex, '<li>$1</li>');
    html = html.replace(/<li>.*?(<\/li>.*?)+/g, '<ul>$&</ul>');
    
    const numberListRegex = /^# (.*?)$/gm;
    html = html.replace(numberListRegex, '<li>$1</li>');
    html = html.replace(/<li>.*?(<\/li>.*?)+/g, '<ol>$&</ol>');
    
    // Handle internal links
    html = html.replace(/\[\[([^|]+)\|([^\]]+)\]\]/g, '<a href="https://en.wikipedia.org/wiki/$1" target="_blank">$2</a>');
    html = html.replace(/\[\[([^\]]+)\]\]/g, '<a href="https://en.wikipedia.org/wiki/$1" target="_blank">$1</a>');
    
    // Handle external links
    html = html.replace(/\[(\S+) (.*?)\]/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>');
    html = html.replace(/\[(\S+)\]/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Remove references
    html = html.replace(/<ref.*?>.*?<\/ref>/g, '');
    html = html.replace(/\[\d+\]/g, '');
    
    // Remove tables (or replace with simple version)
    html = html.replace(/\{\|[\s\S]*?\|\}/g, '');
    
    // Handle piped links that weren't caught earlier
    html = html.replace(/\[\[([^|]+)\|([^\]]+)\]\]/g, '$2');
    html = html.replace(/\[\[([^\]]+)\]\]/g, '$1');
    
    // Convert line breaks
    html = html.replace(/\n{2,}/g, '</p><p>');
    
    // Clean up any remaining MediaWiki syntax
    html = html.replace(/\{\{.*?\}\}/g, ''); // Remove any remaining templates
    html = html.replace(/\[\[|\]\]/g, ''); // Remove any remaining [[ or ]]
    
    // Wrap in paragraph if not already done
    if (!html.startsWith('<p>')) {
      html = '<p>' + html + '</p>';
    }
    
    return html;
  } catch (error) {
    console.error('Error parsing MediaWiki text:', error);
    return `<p>${text}</p>`;
  }
};

// Additional pre-cleaning function
const preCleanText = (text: string): string => {
  // Handle specific patterns like the examples you shared
  let cleaned = text;
  
  // Clean citation/web|url patterns 
  cleaned = cleaned.replace(/\{\{Cite web\|url = http([^}]+)\}\}/g, '');
  
  // Clean platform pattern from example
  cleaned = cleaned.replace(/platform GitHub for \$\d+\.\d+ billion\|date=([^|]+)\|access-date=([^|]+)\|publisher=([^|]+)\|first=([^|]+)\|last=([^|]+)\|website=([^}]+)\}\}/g, '');
  
  return cleaned;
};

const SearchResultItem: React.FC<SearchResultItemProps> = ({ result }) => {
  const { theme } = useTheme();
  const [parsedHtml, setParsedHtml] = useState<string>("");

  useEffect(() => {
    // Get highlighted content or fall back to regular content
    const textContent = result.highlights?.text ? 
      result.highlights.text[0] : 
      result.text.substring(0, 1000) + (result.text.length > 1000 ? '...' : '');
    
    // Pre-clean and then parse the content
    const cleanedContent = preCleanText(textContent);
    setParsedHtml(parseMediaWikiText(cleanedContent));
  }, [result]);

  return (
    <div className={`p-4 border rounded-lg mb-4 ${
      theme === 'dark' ? 'bg-zeta-gray-800 border-zeta-gray-700' : 'bg-white border-zeta-gray-200'
    } transition-all duration-200 hover:shadow-md`}>
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-medium mb-2">
          <a 
            href={result.url || `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))}`}
            target="_blank" 
            rel="noopener noreferrer"
            className={`${
              theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
            }`}
            dangerouslySetInnerHTML={{ __html: result.highlights?.title ? result.highlights.title[0] : result.title }}
          />
        </h3>
        <span className={`text-xs px-2 py-1 rounded-full ${
          theme === 'dark' ? 'bg-zeta-gray-700 text-zeta-gray-300' : 'bg-zeta-gray-200 text-zeta-gray-600'
        }`}>
          Score: {Math.round(result.score * 100) / 100}
        </span>
      </div>
            
      {/* Render the parsed MediaWiki content */}
      <div 
        className={`mt-2 text-sm wiki-content ${
          theme === 'dark' ? 'text-zeta-gray-300' : 'text-zeta-gray-700'
        }`}
        dangerouslySetInnerHTML={{ __html: parsedHtml }}
      />
      
      {/* Display metadata if available */}
      {(result.contributor || result.timestamp) && (
        <div className="mt-3 text-xs flex items-center gap-3">
          {result.contributor && (
            <span className={`${
              theme === 'dark' ? 'text-zeta-gray-400' : 'text-zeta-gray-500'
            }`}>
              <span className="font-medium">By:</span> {result.contributor}
            </span>
          )}
          {result.timestamp && (
            <span className={`${
              theme === 'dark' ? 'text-zeta-gray-400' : 'text-zeta-gray-500'
            }`}>
              <span className="font-medium">Last updated:</span> {new Date(result.timestamp).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchResultItem;