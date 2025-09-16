import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { SearchResult } from '../../context/SearchContext';

interface SearchResultItemProps {
  result: SearchResult;
}
// Function to extract top 3 clean sentences
const extractTopSentences = (text: string, count: number = 3): string => {
  if (!text) return '';
  
  // First, remove all MediaWiki syntax and references
  let cleaned = text;
  
  // Remove citation templates
  cleaned = cleaned.replace(/\{\{Cite[^}]+\}\}/gi, '');
  cleaned = cleaned.replace(/\{\{cite[^}]+\}\}/gi, '');
  
  // Remove all other templates
  cleaned = cleaned.replace(/\{\{[^}]+\}\}/g, '');
  
  // Remove references
  cleaned = cleaned.replace(/<ref.*?>.*?<\/ref>/g, '');
  cleaned = cleaned.replace(/\[\d+\]/g, '');
  
  // Remove internal links but keep the display text
  cleaned = cleaned.replace(/\[\[([^|]+)\|([^\]]+)\]\]/g, '$2');
  cleaned = cleaned.replace(/\[\[([^\]]+)\]\]/g, '$1');
  
  // Remove external links
  cleaned = cleaned.replace(/\[http[^\]]+\]/g, '');
  cleaned = cleaned.replace(/\[(https?:\/\/[^\s\]]+)([^\]]*)\]/g, '$2');
  
  // Remove tables
  cleaned = cleaned.replace(/\{\|[\s\S]*?\|\}/g, '');
  
  // Remove any remaining markup
  cleaned = cleaned.replace(/'''(.*?)'''/g, '$1'); // Bold
  cleaned = cleaned.replace(/''(.*?)''/g, '$1'); // Italic
  cleaned = cleaned.replace(/===+([^=]+)===+/g, ''); // Headers
  
  // Clean up extra whitespace and newlines
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Split into sentences using regex
  const sentences = cleaned.split(/[.!?]+/).filter(sentence => {
    const trimmed = sentence.trim();
    
    // Filter criteria for human-readable sentences
    if (trimmed.length < 20) return false; // Too short
    
    // Check if sentence contains mainly alphabetic characters
    const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
    const totalLength = trimmed.length;
    const letterRatio = letterCount / totalLength;
    
    // Sentence should be at least 60% letters
    if (letterRatio < 0.6) return false;
    
    // Exclude sentences with excessive markup punctuation
    const markupChars = (trimmed.match(/[{}[\]()=|*#:;]/g) || []).length;
    if (markupChars > 3) return false; // Too many markup characters
    
    // Exclude sentences that are mostly numbers or symbols
    const numbersAndSymbols = (trimmed.match(/[0-9@#$%^&*+=<>]/g) || []).length;
    if (numbersAndSymbols > totalLength * 0.3) return false; // More than 30% numbers/symbols
    
    // Exclude sentences that look like code or markup
    if (/^[A-Z_]+\s*[:=]/.test(trimmed)) return false; // Looks like code
    if (/^\d+\s*[.:]\s*/.test(trimmed)) return false; // Numbered lists
    if (/^[*-]\s+/.test(trimmed)) return false; // Bullet points
    
    // Must contain at least one common English word pattern
    const hasCommonWords = /\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by|from|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|can|this|that|these|those)\b/i.test(trimmed);
    if (!hasCommonWords) return false;
    
    return true;
  });
  
  // Take the first 'count' sentences that pass all filters
  const topSentences = sentences.slice(0, count);
  
  // Join them back with periods and clean up
  return topSentences
    .map(sentence => sentence.trim())
    .join('. ')
    .replace(/\.\s*$/, '') + '.'; // Ensure it ends with a single period
};

// Enhanced helper function to transform MediaWiki text to HTML
const parseMediaWikiText = (text: string): string => {
  try {
    let html = text;
    
    // Handle highlighted content from search results first
    html = html.replace(/<mark>(.*?)<\/mark>/g, '<span class="highlight bg-yellow-200 dark:bg-yellow-800">$1</span>');
    
    // Handle bold and italic
    html = html.replace(/'''(.*?)'''/g, '<strong>$1</strong>');
    html = html.replace(/''(.*?)''/g, '<em>$1</em>');
    
    // Convert line breaks to proper paragraphs
    html = html.replace(/\n{2,}/g, '</p><p>');
    
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

const SearchResultItem: React.FC<SearchResultItemProps> = ({ result }) => {
  const { theme } = useTheme();
  const [parsedHtml, setParsedHtml] = useState<string>("");

  useEffect(() => {
    // Get highlighted content or fall back to regular content
    let textContent = '';
    
    // if (result.highlights?.text) {
    //   // If we have highlighted text, use it
    //   textContent = result.highlights.text[0];
    // } else {
      // Extract top 3 clean sentences from the full text
      textContent = extractTopSentences(result.text, 3);
    // }
    
    // Parse the content for display
    setParsedHtml(parseMediaWikiText(textContent));
  }, [result]);

  return (
    <div className={`p-4 border rounded-lg mb-4 ${
      theme === 'dark' ? 'bg-zeta-gray-800 border-zeta-gray-700' : 'bg-white border-zeta-gray-200'
    } transition-all duration-200 hover:shadow-md overflow-hidden`}>
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-medium mb-2 overflow-hidden text-ellipsis">
          <a 
            href={result.url || `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))}`}
            target="_blank" 
            rel="noopener noreferrer"
            className={`${
              theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
            } break-words`}
            dangerouslySetInnerHTML={{ __html: result.highlights?.title ? result.highlights.title[0] : result.title }}
          />
        </h3>
        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2 ${
          theme === 'dark' ? 'bg-zeta-gray-700 text-zeta-gray-300' : 'bg-zeta-gray-200 text-zeta-gray-600'
        }`}>
          Score: {Math.round(result.score * 100) / 100}
        </span>
      </div>
            
      {/* Render the top 3 clean sentences */}
      <div 
        className={`mt-2 text-sm leading-relaxed break-words overflow-hidden ${
          theme === 'dark' ? 'text-zeta-gray-300' : 'text-zeta-gray-700'
        }`}
        dangerouslySetInnerHTML={{ __html: parsedHtml }}
      />
      
      {/* Custom CSS for highlights */}
      <style>{`
        .highlight {
          padding: 1px 3px;
          border-radius: 2px;
          font-weight: 500;
        }
        .wiki-content p {
          margin: 0.5rem 0;
        }
        .wiki-content p:first-child {
          margin-top: 0;
        }
        .wiki-content p:last-child {
          margin-bottom: 0;
        }
      `}</style>
      
      {/* Display metadata if available */}
      {(result.contributor || result.timestamp) && (
        <div className="mt-3 text-xs flex flex-wrap items-center gap-3">
          {result.contributor && (
            <span className={`${
              theme === 'dark' ? 'text-zeta-gray-400' : 'text-zeta-gray-500'
            } break-words`}>
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