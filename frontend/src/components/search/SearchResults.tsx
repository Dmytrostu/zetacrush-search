import React from 'react';
import SearchResultItem from './SearchResultItem';
import { SearchResult } from '../../types/search.types';
import { useSearch } from '../../context/SearchContext';

interface SearchResultsProps {
  items: SearchResult[];
}

const SearchResults: React.FC<SearchResultsProps> = ({ items }) => {
  const { totalResults, query, apiHealthy } = useSearch();
  
  // Show API status warning if API is not healthy
  if (!apiHealthy) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <p className="text-yellow-700">
          Warning: The search API is currently experiencing issues. Search results may be unavailable.
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-lg text-zeta-gray-600 dark:text-zeta-gray-300">No results found</p>
      </div>
    );
  }

  // Use the highest scoring result as the featured snippet
  const featuredSnippet = items[0];
  const featuredUrl = featuredSnippet.url || 
    `https://en.wikipedia.org/wiki/${encodeURIComponent(featuredSnippet.title.replace(/ /g, '_'))}`;

  return (
    <div className="space-y-8">
      {/* Results count */}
      <div className="text-sm text-zeta-gray-600 dark:text-zeta-gray-400">
        Found about {totalResults.toLocaleString()} results for "{query}"
      </div>
      
      {/* Featured snippet - Google-style */}
      {featuredSnippet && featuredSnippet.score > 10 && (
        <div className="bg-zeta-white dark:bg-zeta-gray-800 rounded-lg border border-zeta-gray-200 dark:border-zeta-gray-700 p-4 mb-6">
          <div className="text-sm text-zeta-gray-500 dark:text-zeta-gray-400 mb-2">Featured snippet</div>
          <h3 className="font-medium text-lg mb-2">{featuredSnippet.title}</h3>
          <p className="text-sm mb-3">{featuredSnippet.text?.substring(0, 200)}...</p>
          <div className="text-sm text-zeta-gray-600 dark:text-zeta-gray-400 mb-1">
            wikipedia.org › wiki › {featuredSnippet.title.replace(/ /g, '_')}
          </div>
          <a href={featuredUrl} className="text-zeta-gray-600 text-sm hover:underline">Learn more</a>
        </div>
      )}
      
      {/* Regular search results - Google-style */}
      <div className="space-y-7">
        {items.map(result => (
          <SearchResultItem key={result.id} item={result} />
        ))}
      </div>
      
      {/* People also ask - Google-style */}
      <div className="bg-zeta-white dark:bg-zeta-gray-800 rounded-lg border border-zeta-gray-200 dark:border-zeta-gray-700 p-4 mt-6 mb-8">
        <h3 className="text-lg font-medium mb-4">People also ask</h3>
        <div className="space-y-3">
          <details className="cursor-pointer">
            <summary className="text-sm font-medium text-zeta-gray-800 dark:text-zeta-gray-200 py-2 hover:bg-zeta-gray-50 dark:hover:bg-zeta-gray-700">
              What is a search engine?
            </summary>
            <div className="pl-5 pt-2 pb-3 text-sm">
              <p>A search engine is a software system designed to search for information on the World Wide Web.</p>
              <a href="#" className="text-zeta-gray-600 text-sm block mt-2 hover:underline">Learn more</a>
            </div>
          </details>
          <details className="cursor-pointer">
            <summary className="text-sm font-medium text-zeta-gray-800 dark:text-zeta-gray-200 py-2 hover:bg-zeta-gray-50 dark:hover:bg-zeta-gray-700">
              How do search engines work?
            </summary>
            <div className="pl-5 pt-2 pb-3 text-sm">
              <p>Search engines work by crawling billions of pages using web crawlers.</p>
              <a href="#" className="text-zeta-gray-600 text-sm block mt-2 hover:underline">Learn more</a>
            </div>
          </details>
          <details className="cursor-pointer">
            <summary className="text-sm font-medium text-gray-800 dark:text-gray-200 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
              What is SEO?
            </summary>
            <div className="pl-5 pt-2 pb-3 text-sm">
              <p>SEO stands for Search Engine Optimization, which is the practice of increasing the quantity and quality of traffic to your website through organic search engine results.</p>
              <a href="#" className="text-blue-600 text-sm block mt-2 hover:underline">Learn more</a>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;