import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSearch } from '../context/SearchContext';
import { useTheme } from '../context/ThemeContext';
import SearchBar from '../components/search/SearchBar';
import SearchFilters from '../components/search/SearchFilters';
import SearchResults from '../components/search/SearchResults';
import Pagination from '../components/search/Pagination';
import Loader from '../components/common/Loader';

const ResultsPage: React.FC = () => {
  const { query, searchResults, isLoading, performSearch, totalResults } = useSearch();
  const { theme, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get current page from URL or default to 1
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  
  // Stats for search results
  const resultStats = {
    count: totalResults || 0,
    time: 0.42, // Mock response time
  };
  
  // Animation effect
  useEffect(() => {
    // Start with animation
    setIsAnimating(true);
    
    // Use a timeout to allow the component to render first with the initial state
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 400);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Search effect - run search when query or page changes
  useEffect(() => {
    if (query) {
      performSearch(query, currentPage);
    }
  }, [query, currentPage]);
  
  // Handle page change
  const handlePageChange = (page: number) => {
    // Update URL with new page parameter
    setSearchParams({ query: query, page: page.toString() });
    // Scroll to top
    window.scrollTo(0, 0);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-zeta-gray-900 text-zeta-white' : 'bg-zeta-white text-zeta-gray-800'}`}>
      {/* Header with search bar that animates from center to top */}
      <header className={`transition-all duration-500 ease-in-out border-b border-zeta-gray-200 dark:border-zeta-gray-700 sticky top-0 bg-zeta-white dark:bg-zeta-gray-900 z-10 ${
        isAnimating 
          ? 'py-16 md:py-24 border-transparent' 
          : 'py-2 shadow-sm'
      }`}>
        <div className="container mx-auto px-4">
          <div className={`flex transition-all duration-500 ease-in-out ${
            isAnimating 
              ? 'flex-col items-center justify-center' 
              : 'flex-row items-center'
          }`}>
            {/* Logo */}
            <Link to="/" className={`transform transition-all duration-500 ${
              isAnimating 
                ? 'mb-8 translate-y-4' 
                : 'mb-0 mr-8 translate-y-0'
            }`}>
              <h1 className={`font-bold transform transition-all duration-500 ${
                isAnimating ? 'text-5xl md:text-6xl scale-110' : 'text-2xl scale-100'
              }`}>
                <span className="text-zeta-gray-400">Z</span>
                <span className="text-zeta-gray-500">e</span>
                <span className="text-zeta-gray-600">t</span>
                <span className="text-zeta-gray-700">a</span>
                <span className="text-zeta-gray-800">C</span>
                <span className="text-zeta-gray-700">r</span>
                <span className="text-zeta-gray-600">u</span>
                <span className="text-zeta-gray-500">s</span>
                <span className="text-zeta-gray-400">h</span>
              </h1>
            </Link>
            
            {/* Search Bar */}
            <div className={`w-full transform transition-all duration-500 ${
              isAnimating 
                ? 'max-w-2xl scale-110 translate-y-4' 
                : 'max-w-xl scale-100 translate-y-0'
            }`}>
              <SearchBar isHomePage={isAnimating} />
            </div>
            
            {/* Right side icons */}
            <div className="ml-auto flex items-center gap-4 mt-4 md:mt-0">
              
              <button className="bg-zeta-gray-600 text-zeta-white px-3 py-1.5 rounded-md hover:bg-zeta-gray-700 text-sm">
                Sign in
              </button>
            </div>
          </div>
          
          {/* Search filters/tabs */}
          <div className="flex gap-6 mt-3 text-sm overflow-x-auto pb-1">
            <button className="flex items-center gap-1 text-zeta-gray-600 border-b-2 border-zeta-gray-600 pb-2 px-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M12.9 14.32a8 8 0 1 1 1.41-1.41l5.35 5.33-1.42 1.42-5.33-5.34zM8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12z"></path>
              </svg>
              All
            </button>
            <button className="flex items-center gap-1 text-zeta-gray-600 dark:text-zeta-gray-300 hover:text-zeta-gray-800 px-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0-6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path>
              </svg>
              Images
            </button>
            <button className="flex items-center gap-1 text-zeta-gray-600 dark:text-zeta-gray-300 hover:text-zeta-gray-800 px-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0-6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path>
              </svg>
              Videos
            </button>
            <button className="flex items-center gap-1 text-zeta-gray-600 dark:text-zeta-gray-300 hover:text-zeta-gray-800 px-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0-6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path>
              </svg>
              News
            </button>
            <button className="flex items-center gap-1 text-zeta-gray-600 dark:text-zeta-gray-300 hover:text-zeta-gray-800 px-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0-6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path>
              </svg>
              Shopping
            </button>
            <button className="flex items-center gap-1 text-zeta-gray-600 dark:text-zeta-gray-300 hover:text-zeta-gray-800 px-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0-6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path>
              </svg>
              More
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className={`container mx-auto px-4 pt-4 pb-12 grid grid-cols-1 lg:grid-cols-4 gap-8 transition-all duration-700 ${
        isAnimating 
          ? 'opacity-0 transform translate-y-10' 
          : 'opacity-100 transform translate-y-0'
      }`}>
        {/* Left sidebar with filters on desktop */}
        <aside className="hidden lg:block">
          <SearchFilters />
        </aside>
        
        {/* Main results */}
        <div className="lg:col-span-3">
          {/* Results stats */}
          {!isLoading && searchResults.length > 0 && (
            <p className="text-sm text-zeta-gray-500 dark:text-zeta-gray-400 mb-4">
              About {resultStats.count.toLocaleString()} results ({resultStats.time} seconds)
            </p>
          )}
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xl mb-4">No results found for "{query}"</p>
              <p className="text-zeta-gray-600 dark:text-zeta-gray-400 mb-6">
                Try checking your spelling or use more general terms
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button className="px-3 py-1 bg-zeta-gray-100 dark:bg-zeta-gray-800 rounded-full text-sm hover:bg-zeta-gray-200 dark:hover:bg-zeta-gray-700">
                  Search for similar terms
                </button>
                <button className="px-3 py-1 bg-zeta-gray-100 dark:bg-zeta-gray-800 rounded-full text-sm hover:bg-zeta-gray-200 dark:hover:bg-zeta-gray-700">
                  Browse popular topics
                </button>
              </div>
            </div>
          ) : (
            <SearchResults items={searchResults} />
          )}
          
          {/* Pagination */}
          {!isLoading && searchResults.length > 0 && (
            <>
              {/* Logo */}
              <div className="mt-10 flex justify-center mb-4">
                <div className="flex items-center space-x-2">
                  <div className="text-zeta-gray-400 font-bold">Z</div>
                  <div className="text-zeta-gray-500 font-bold">e</div>
                  <div className="text-zeta-gray-600 font-bold">t</div>
                  <div className="text-zeta-gray-700 font-bold">a</div>
                  <div className="text-zeta-gray-800 font-bold">C</div>
                  <div className="text-zeta-gray-700 font-bold">r</div>
                  <div className="text-zeta-gray-600 font-bold">u</div>
                  <div className="text-zeta-gray-500 font-bold">s</div>
                  <div className="text-zeta-gray-400 font-bold">h</div>
                </div>
              </div>
              
              {/* Real pagination from our component */}
              <Pagination onPageChange={handlePageChange} />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResultsPage;