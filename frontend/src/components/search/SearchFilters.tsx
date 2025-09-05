import React from 'react';
import { useSearch } from '../../context/SearchContext';

const SearchFilters: React.FC = () => {
  const { filters, setFilters } = useSearch();

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
  };

  return (
    <div className="pr-4">
      {/* Tools Button - Like Google's tools button */}
      <button className="text-sm text-zeta-gray-700 dark:text-zeta-gray-300 hover:bg-zeta-gray-100 dark:hover:bg-zeta-gray-700 px-3 py-1 rounded-full mb-5">
        Tools
      </button>
      
      {/* Time Filter - Google-style filter group */}
      <div className="mb-8">
        <h3 className="text-base font-medium mb-2 text-zeta-gray-800 dark:text-zeta-gray-200">Time</h3>
        <ul className="space-y-1">
          <li>
            <button 
              className={`text-sm py-1 block w-full text-left ${filters.timeRange === 'any' ? 'font-medium text-zeta-gray-600' : 'text-zeta-gray-700 dark:text-zeta-gray-300'}`}
              onClick={() => handleFilterChange('timeRange', 'any')}
            >
              Any time
            </button>
          </li>
          <li>
            <button 
              className={`text-sm py-1 block w-full text-left ${filters.timeRange === 'past24h' ? 'font-medium text-zeta-gray-600' : 'text-zeta-gray-700 dark:text-zeta-gray-300'}`}
              onClick={() => handleFilterChange('timeRange', 'past24h')}
            >
              Past 24 hours
            </button>
          </li>
          <li>
            <button 
              className={`text-sm py-1 block w-full text-left ${filters.timeRange === 'pastWeek' ? 'font-medium text-zeta-gray-600' : 'text-zeta-gray-700 dark:text-zeta-gray-300'}`}
              onClick={() => handleFilterChange('timeRange', 'pastWeek')}
            >
              Past week
            </button>
          </li>
          <li>
            <button 
              className={`text-sm py-1 block w-full text-left ${filters.timeRange === 'pastMonth' ? 'font-medium text-zeta-gray-600' : 'text-zeta-gray-700 dark:text-zeta-gray-300'}`}
              onClick={() => handleFilterChange('timeRange', 'pastMonth')}
            >
              Past month
            </button>
          </li>
          <li>
            <button 
              className={`text-sm py-1 block w-full text-left ${filters.timeRange === 'pastYear' ? 'font-medium text-zeta-gray-600' : 'text-zeta-gray-700 dark:text-zeta-gray-300'}`}
              onClick={() => handleFilterChange('timeRange', 'pastYear')}
            >
              Past year
            </button>
          </li>
          <li>
            <button 
              className="text-sm py-1 block w-full text-left text-gray-700 dark:text-gray-300"
            >
              Custom range...
            </button>
          </li>
        </ul>
      </div>
      
      {/* Result Type Filter */}
      <div className="mb-8">
        <h3 className="text-base font-medium mb-2 text-gray-800 dark:text-gray-200">Type</h3>
        <ul className="space-y-1">
          <li>
            <button 
              className={`text-sm py-1 block w-full text-left ${filters.contentType === 'any' ? 'font-medium text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}
              onClick={() => handleFilterChange('contentType', 'any')}
            >
              All results
            </button>
          </li>
          <li>
            <button 
              className={`text-sm py-1 block w-full text-left ${filters.contentType === 'articles' ? 'font-medium text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}
              onClick={() => handleFilterChange('contentType', 'articles')}
            >
              Articles
            </button>
          </li>
          <li>
            <button 
              className={`text-sm py-1 block w-full text-left ${filters.contentType === 'videos' ? 'font-medium text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}
              onClick={() => handleFilterChange('contentType', 'videos')}
            >
              Videos
            </button>
          </li>
          <li>
            <button 
              className={`text-sm py-1 block w-full text-left ${filters.contentType === 'images' ? 'font-medium text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}
              onClick={() => handleFilterChange('contentType', 'images')}
            >
              Images
            </button>
          </li>
        </ul>
      </div>
      
      {/* Verbatim Filter - Google has this option */}
      <div className="mb-8">
        <h3 className="text-base font-medium mb-2 text-gray-800 dark:text-gray-200">Verbatim</h3>
        <div className="flex items-center">
          <input 
            type="checkbox" 
            id="verbatim" 
            className="mr-2 h-4 w-4 text-blue-500"
          />
          <label htmlFor="verbatim" className="text-sm text-gray-700 dark:text-gray-300">
            Search for exact words or phrases
          </label>
        </div>
      </div>
      
      {/* Sort By Filter */}
      <div className="mb-8">
        <h3 className="text-base font-medium mb-2 text-gray-800 dark:text-gray-200">Sort by</h3>
        <ul className="space-y-1">
          <li>
            <button 
              className={`text-sm py-1 block w-full text-left ${filters.sortBy === 'relevance' ? 'font-medium text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}
              onClick={() => handleFilterChange('sortBy', 'relevance')}
            >
              Relevance
            </button>
          </li>
          <li>
            <button 
              className={`text-sm py-1 block w-full text-left ${filters.sortBy === 'date' ? 'font-medium text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}
              onClick={() => handleFilterChange('sortBy', 'date')}
            >
              Date
            </button>
          </li>
        </ul>
      </div>
      
      {/* All results section */}
      <div>
        <h3 className="text-base font-medium mb-2 text-gray-800 dark:text-gray-200">All results</h3>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center mb-2">
            <input 
              type="radio" 
              id="all_results" 
              name="result_filter" 
              className="mr-2 h-4 w-4 text-blue-500"
              defaultChecked
            />
            <label htmlFor="all_results">
              Search all pages
            </label>
          </div>
          <div className="flex items-center">
            <input 
              type="radio" 
              id="visited_pages" 
              name="result_filter" 
              className="mr-2 h-4 w-4 text-blue-500"
            />
            <label htmlFor="visited_pages">
              Search pages you've visited
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchFilters;