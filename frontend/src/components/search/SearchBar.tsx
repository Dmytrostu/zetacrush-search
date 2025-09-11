import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSearch } from '../../context/SearchContext';

const SearchBar: React.FC<{ isHomePage?: boolean }> = ({ isHomePage = false }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { query, performSearch, suggestions: apiSuggestions } = useSearch();
  const [searchInput, setSearchInput] = useState(query);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update input when query changes
  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  // Update suggestions based on API suggestions
  useEffect(() => {
    if (apiSuggestions && apiSuggestions.length > 0) {
      setSuggestions(apiSuggestions);
    } else if (searchInput) {
      // Default suggestions if no API suggestions
      setSuggestions([
        `${searchInput}`,
        `${searchInput} wikipedia`,
        `${searchInput} article`,
        `${searchInput} definition`,
        `${searchInput} near me`,
        `${searchInput} online`,
        `${searchInput} history`,
        `${searchInput} review`
      ]);
    }

    // Show suggestions if we have input text
    if (searchInput) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchInput, apiSuggestions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      // Update search params to include the current page as 1
      navigate(`/results?query=${encodeURIComponent(searchInput)}&page=1`);
      await performSearch(searchInput);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    // Use the suggestion text directly
    setSearchInput(suggestion);
    // Update search params to include the current page as 1
    navigate(`/results?query=${encodeURIComponent(suggestion)}&page=1`);
    await performSearch(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div 
      ref={searchRef}
      className={`w-full relative transform transition-all duration-500 ease-in-out ${isHomePage ? 'scale-100' : 'scale-95'}`}
    >
      <form 
        onSubmit={handleSubmit} 
        className={`flex w-full items-center rounded-full border 
          ${isFocused 
            ? 'shadow-lg border-zeta-gray-300 dark:border-zeta-gray-600' 
            : `${isHomePage ? 'shadow-lg' : 'shadow-md'} border-zeta-gray-200 dark:border-zeta-gray-700`}
          ${isHomePage ? 'py-1' : 'py-1'}`}
      >
        <div className="pl-5">
          <svg className="h-5 w-5 text-zeta-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            if (searchInput) setShowSuggestions(true);
          }}
          onBlur={() => setIsFocused(false)}
          className="w-full py-3 px-4 bg-transparent focus:outline-none text-zeta-gray-800 dark:text-zeta-white text-base rounded-full"
          placeholder="Search Google or type a URL"
        />
        {searchInput && (
          <button 
            type="button"
            onClick={() => setSearchInput('')}
            className="text-zeta-gray-500 hover:text-zeta-gray-700 px-2"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"></path>
            </svg>
          </button>
        )}
        <div className="flex items-center px-4 space-x-2">
          <button type="button" className="text-zeta-gray-500 hover:text-zeta-gray-700">
            <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="22"></line>
            </svg>
          </button>
          <button type="button" className="text-zeta-gray-500 hover:text-zeta-gray-700">
            <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <button 
            type="submit"
            className="hidden md:block bg-zeta-gray-100 hover:bg-zeta-gray-200 dark:bg-zeta-gray-700 dark:hover:bg-zeta-gray-600 p-2 rounded-full"
          >
            <svg className="h-5 w-5 text-zeta-gray-600 dark:text-zeta-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && searchInput && (
        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-zeta-gray-800 rounded-lg shadow-lg border border-zeta-gray-200 dark:border-zeta-gray-700 overflow-hidden z-50">
          <ul>
            {suggestions.map((suggestion, index) => (
              <li key={index}
                className="flex items-center px-5 py-3 hover:bg-zeta-gray-100 dark:hover:bg-zeta-gray-700 cursor-pointer"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <svg className="h-5 w-5 text-zeta-gray-500 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchBar;


