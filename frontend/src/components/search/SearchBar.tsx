import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../../context/SearchContext';

const SearchBar: React.FC<{ isHomePage?: boolean }> = ({ isHomePage = false }) => {
  const navigate = useNavigate();
  const { query, performSearch } = useSearch();
  const [searchInput, setSearchInput] = useState(query);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock suggestions based on input
  const mockSuggestions = [
    { query: 'search', suggestions: ['search - Google Search', 'search people free', 'search engines', 'manage search engines', 'search and seizure - Google Search', 'search fund', 'searchtempest', 'search console', 'search party', 'search history'] },
    { query: 'react', suggestions: ['react js', 'react native', 'react hooks', 'react router', 'react context api', 'reactjs.org', 'react typescript', 'react redux', 'react bootstrap', 'react native elements'] },
    { query: 'javascript', suggestions: ['javascript tutorial', 'javascript vs typescript', 'javascript array methods', 'javascript promises', 'javascript dom manipulation', 'javascript frameworks', 'javascript date format', 'javascript es6', 'javascript map', 'javascript regex'] }
  ];

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

  // Update suggestions when input changes
  useEffect(() => {
    if (searchInput) {
      // Find matching suggestions from our mock data
      const matchedSuggestion = mockSuggestions.find(item => 
        searchInput.toLowerCase().includes(item.query.toLowerCase())
      );
      
      if (matchedSuggestion) {
        setSuggestions(matchedSuggestion.suggestions);
      } else {
        // Default suggestions if no match
        setSuggestions([
          `${searchInput} - Google Search`,
          `${searchInput} tutorial`,
          `${searchInput} wikipedia`,
          `${searchInput} meaning`,
          `${searchInput} near me`,
          `${searchInput} online`,
          `${searchInput} free download`,
          `${searchInput} review`,
        ]);
      }
      setShowSuggestions(true);
      setSelectedSuggestionIndex(-1); // Reset selection when input changes
    } else {
      setShowSuggestions(false);
    }
  }, [searchInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      // Navigate immediately
      setShowSuggestions(false);
      navigate('/results');
      
      // Perform search in the background
      performSearch(searchInput).catch(error => {
        console.error("Search failed:", error);
      });
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Extract just the text part from suggestions like "search - Google Search"
    const actualQuery = suggestion.split(' - ')[0];
    setSearchInput(actualQuery);
    
    // Navigate immediately
    setShowSuggestions(false);
    navigate('/results');
    
    // Perform search in the background
    performSearch(actualQuery).catch(error => {
      console.error("Search failed:", error);
    });
  };

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    
    // Arrow down - move selection down
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prevIndex => 
        prevIndex < suggestions.length - 1 ? prevIndex + 1 : prevIndex
      );
    }
    
    // Arrow up - move selection up
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prevIndex => 
        prevIndex > 0 ? prevIndex - 1 : 0
      );
    }
    
    // Enter - select the highlighted suggestion or submit the form
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0) {
        handleSuggestionClick(suggestions[selectedSuggestionIndex]);
      } else {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
    
    // Escape - close suggestions
    else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
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
        <div className="pl-1"></div>
        <input
          ref={inputRef}
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
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
            {suggestions.map((suggestion, index) => {
              // For search party with image
              if (suggestion.toLowerCase().includes('search party')) {
                return (
                  <li key={index} 
                    className={`flex items-center px-5 py-3 hover:bg-zeta-gray-100 dark:hover:bg-zeta-gray-700 cursor-pointer ${selectedSuggestionIndex === index ? 'bg-zeta-gray-100 dark:bg-zeta-gray-700' : ''}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="w-8 h-8 mr-3 flex-shrink-0">
                      <div className="w-8 h-8 bg-zeta-gray-300 dark:bg-zeta-gray-600 rounded-md flex items-center justify-center">
                        <span className="text-xs">SP</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Search Party</div>
                      <div className="text-sm text-zeta-gray-500">Comedy series</div>
                    </div>
                  </li>
                );
              }
              
              // For "manage search engines" with settings icon
              if (suggestion.toLowerCase().includes('manage search engines')) {
                return (
                  <li key={index}
                    className={`flex items-center px-5 py-3 hover:bg-zeta-gray-100 dark:hover:bg-zeta-gray-700 cursor-pointer ${selectedSuggestionIndex === index ? 'bg-zeta-gray-100 dark:bg-zeta-gray-700' : ''}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="w-5 h-5 mr-3">
                      <svg className="h-5 w-5 text-zeta-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.3246 4.31731C10.751 2.5609 13.249 2.5609 13.6754 4.31731C13.9508 5.45193 15.2507 5.99038 16.2478 5.38285C17.7913 4.44239 19.5576 6.2087 18.6172 7.75218C18.0096 8.74925 18.5481 10.0492 19.6827 10.3246C21.4391 10.751 21.4391 13.249 19.6827 13.6754C18.5481 13.9508 18.0096 15.2507 18.6172 16.2478C19.5576 17.7913 17.7913 19.5576 16.2478 18.6172C15.2507 18.0096 13.9508 18.5481 13.6754 19.6827C13.249 21.4391 10.751 21.4391 10.3246 19.6827C10.0492 18.5481 8.74926 18.0096 7.75219 18.6172C6.2087 19.5576 4.44239 17.7913 5.38285 16.2478C5.99038 15.2507 5.45193 13.9508 4.31731 13.6754C2.5609 13.249 2.5609 10.751 4.31731 10.3246C5.45193 10.0492 5.99037 8.74926 5.38285 7.75218C4.44239 6.2087 6.2087 4.44239 7.75219 5.38285C8.74926 5.99037 10.0492 5.45193 10.3246 4.31731Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span>Manage search engines</span>
                  </li>
                );
              }
              
              // Regular search suggestions
              return (
                <li key={index}
                  className={`flex items-center px-5 py-3 hover:bg-zeta-gray-100 dark:hover:bg-zeta-gray-700 cursor-pointer ${selectedSuggestionIndex === index ? 'bg-zeta-gray-100 dark:bg-zeta-gray-700' : ''}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <svg className="h-5 w-5 text-zeta-gray-500 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <span>{suggestion}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchBar;