import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { SearchResult } from '../../context/SearchContext';
import { extractTopSentences, parseMediaWikiText } from '../../utils/helpers';

interface SearchResultItemProps {
  result: SearchResult;
}
// Function to extract top 3 clean sentences

// Enhanced helper function to transform MediaWiki text to HTML


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
      textContent = extractTopSentences(result.text, 5);
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