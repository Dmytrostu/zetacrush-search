import React from 'react';
import { SearchResult } from '../../types/search.types';

interface SearchResultItemProps {
  item: SearchResult;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ item }) => {
  // Format the URL to look like Google's display URL
  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return `${urlObj.hostname}${urlObj.pathname.length > 1 ? ' › ' + urlObj.pathname.split('/').filter(Boolean).join(' › ') : ''}`;
    } catch (e) {
      return url;
    }
  };

  // Mock breadcrumb data
  const breadcrumb = formatUrl(item.url);
  
  // Format the date - Google often shows dates for results
  const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '';

  return (
    <div className="max-w-2xl">
      {/* Breadcrumbs/URL display like Google */}
      <div className="flex items-center mb-1">
        <p className="text-sm text-zeta-gray-600 dark:text-zeta-gray-400 truncate">{breadcrumb}</p>
        {date && (
          <>
            <span className="mx-2 text-zeta-gray-400">•</span>
            <p className="text-sm text-zeta-gray-600 dark:text-zeta-gray-400">{date}</p>
          </>
        )}
      </div>
      
      {/* Title - Google style */}
      <h3 className="group">
        <a 
          href={item.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xl text-zeta-gray-800 dark:text-zeta-gray-300 font-medium group-hover:underline"
        >
          {item.title}
        </a>
      </h3>
      
      {/* Description - Google style */}
      <p className="text-sm text-zeta-gray-700 dark:text-zeta-gray-300 mt-1 line-clamp-2">
        {item.description}
      </p>
      
      {/* Additional links - Like Google's sitelinks */}
      {Math.random() > 0.5 && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <a href="#" className="text-blue-600 hover:underline truncate">Related Link 1</a>
          <a href="#" className="text-blue-600 hover:underline truncate">Related Link 2</a>
          <a href="#" className="text-blue-600 hover:underline truncate">Related Link 3</a>
          <a href="#" className="text-blue-600 hover:underline truncate">Related Link 4</a>
        </div>
      )}
    </div>
  );
};

export default SearchResultItem;