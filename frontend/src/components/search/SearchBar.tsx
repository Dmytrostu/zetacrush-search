import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSearch } from '../../context/SearchContext';
import { useTheme } from '../../context/ThemeContext';

interface SearchBarProps {
  isHomePage?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ isHomePage = false }) => {
  const { query, setQuery, performSearch, suggestions, isLoading, fetchSuggestions } = useSearch();
  const { theme } = useTheme();
  const [inputValue, setInputValue] = useState(query);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Debounce function
  const debounce = <F extends (...args: any[]) => any>(
    func: F,
    delay: number
  ) => {
    let timeoutId: ReturnType<typeof setTimeout>;

    return (...args: Parameters<F>): void => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  // Sync input value with query from context
  useEffect(() => {
    setInputValue(query || '');
  }, [query]);

  // Debounced suggestion fetcher
  const debouncedFetchSuggestions = useCallback(
    debounce((value: string) => {
      if (value.trim().length >= 2) {
        setIsFetchingSuggestions(true);
        fetchSuggestions(value)
          .finally(() => setIsFetchingSuggestions(false));
      }
    }, 300),
    [fetchSuggestions]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue && inputValue.trim()) {
      performSearch(inputValue.trim());
      setShowSuggestions(false);
    } else if (isHomePage) {
      // Do nothing if we're on home page with empty query
      return;
    } else {
      // If query is empty and we're not on home page, navigate to home
      navigate('/');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Only fetch suggestions if we have at least 2 characters
    if (value.trim().length >= 2) {
      debouncedFetchSuggestions(value);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleClearInput = () => {
    setInputValue('');
    setQuery('');
    setShowSuggestions(false);

    // If we're on the results page, navigate back to home
    if (!isHomePage && location.pathname.includes('/results')) {
      navigate('/');
    }

    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setQuery(suggestion);
    performSearch(suggestion);
    setShowSuggestions(false);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative w-full flex items-center">
          {/* Search icon (left) */}
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zeta-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            className={`w-full pl-10 pr-12 py-3 rounded-full border ${theme === 'dark'
                ? 'bg-zeta-gray-800 border-zeta-gray-700 text-white placeholder-zeta-gray-400'
                : 'bg-white border-zeta-gray-300 text-zeta-gray-900 placeholder-zeta-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder={
              isHomePage
                ? "Search for articles, topics, or keywords..."
                : "Search..."
            }
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />

          {/* Clear button */}
          {inputValue && (
            <button
              type="button"
              className="absolute right-16 top-1/2 transform -translate-y-1/2 text-zeta-gray-400 hover:text-zeta-gray-600 dark:hover:text-zeta-gray-200 focus:outline-none"
              onClick={handleClearInput}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          {/* Search button with icon instead of text */}
          <button
            type="submit"
            className={`absolute right-0 top-0 h-full px-4 rounded-r-full ${isLoading ? 'opacity-75 cursor-wait' : ''
              } ${theme === 'dark'
                ? 'bg-zeta-gray-700 hover:bg-zeta-gray-600 text-white'
                : 'bg-zeta-gray-200 hover:bg-zeta-gray-300 text-zeta-gray-800'
              } focus:outline-none`}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="h-5 w-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Search suggestions */}
      {showSuggestions && inputValue.trim().length >= 2 && (
        <div
          ref={suggestionsRef}
          className={`absolute z-10 w-full mt-1 rounded-md shadow-lg ${theme === 'dark'
              ? 'bg-zeta-gray-800 border border-zeta-gray-700'
              : 'bg-white border border-zeta-gray-300'
            }`}
        >
          {isFetchingSuggestions ? (
            <div className="py-3 px-4 text-center">
              <div className="inline-block h-4 w-4 border-t-2 border-b-2 border-zeta-gray-400 rounded-full animate-spin mr-2"></div>
              <span className={`text-sm ${theme === 'dark' ? 'text-zeta-gray-300' : 'text-zeta-gray-600'}`}>
                Loading suggestions...
              </span>
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="py-1">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className={`px-4 py-2 cursor-pointer flex items-center ${theme === 'dark'
                      ? 'hover:bg-zeta-gray-700 text-white'
                      : 'hover:bg-zeta-gray-100 text-zeta-gray-900'
                    }`}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <svg className="h-4 w-4 mr-2 text-zeta-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {suggestion}
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-3 px-4 text-center">
              <span className={`text-sm ${theme === 'dark' ? 'text-zeta-gray-400' : 'text-zeta-gray-500'}`}>
                No suggestions found
              </span>
            </div>
          )}

          {/* Quick search options */}
          {inputValue.trim().length >= 2 && suggestions.length > 0 && (
            <div className={`px-3 py-2 border-t ${theme === 'dark' ? 'border-zeta-gray-700' : 'border-zeta-gray-200'
              }`}>
              <div className={`text-xs mb-1 ${theme === 'dark' ? 'text-zeta-gray-400' : 'text-zeta-gray-500'
                }`}>Quick searches:</div>
              <div className="flex flex-wrap gap-1">
                {[`"${inputValue}" exact match`, `${inputValue} definition`, `${inputValue} tutorial`].map((quickSearch, i) => (
                  <button
                    key={i}
                    className={`text-xs px-2 py-1 rounded-full ${theme === 'dark'
                        ? 'bg-zeta-gray-700 text-zeta-gray-300 hover:bg-zeta-gray-600'
                        : 'bg-zeta-gray-100 text-zeta-gray-700 hover:bg-zeta-gray-200'
                      }`}
                    onClick={() => handleSuggestionClick(quickSearch)}
                  >
                    {quickSearch}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;