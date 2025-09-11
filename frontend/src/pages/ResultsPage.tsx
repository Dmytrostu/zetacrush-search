import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSearch } from '../context/SearchContext';
import { useTheme } from '../context/ThemeContext';
import SearchBar from '../components/search/SearchBar';
import SearchResults from '../components/search/SearchResults';
import Pagination from '../components/search/Pagination';
import Loader from '../components/common/Loader';
import Footer from '../components/layout/Footer';

const ResultsPage: React.FC = () => {
  const { query, searchResults, isLoading, performSearch, totalResults, pageSize } = useSearch();
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
  const handlePageChange = (page: number, newPageSize?: number) => {
    // Use the new page size or keep the current one
    const size = newPageSize || pageSize;
    
    // Update URL with new page parameter and page size if provided
    const params: Record<string, string> = { 
      query: query, 
      page: page.toString() 
    };
    
    // Only add page size if it's different from default
    if (size !== 10) {
      params.pageSize = size.toString();
    }
    
    setSearchParams(params);
    
    // Perform search with new parameters
    performSearch(query, page, size);
    
    // Scroll to top
    window.scrollTo(0, 0);
  };

  return (
    <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'bg-zeta-gray-900 text-zeta-white' : 'bg-zeta-white text-zeta-gray-800'}`}>
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
          </div>
        </div>
      </header>
      
      {/* Main content - added flex-grow to push footer down */}
      <main className={`flex-grow container mx-auto px-4 pt-4 pb-12 grid grid-cols-1 gap-8 transition-all duration-700 ${
        isAnimating 
          ? 'opacity-0 transform translate-y-10' 
          : 'opacity-100 transform translate-y-0'
      }`}>
        {/* Left sidebar with filters on desktop */}
        
        {/* Main results */}
        <div className="lg:col-span-3">
          
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
      
      {/* Footer - added mt-auto to keep it at bottom */}
      <footer className={`relative mt-auto z-10 transition-opacity duration-500 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
        <Footer />
      </footer>
    </div>
  );
};

export default ResultsPage;