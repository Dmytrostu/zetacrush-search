import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { SearchResult, SearchFilter, SearchResponse } from '../types/search.types';
import { searchApi } from '../api';

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  searchResults: SearchResult[];
  setSearchResults: (results: SearchResult[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  filters: SearchFilter;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilter>>;
  performSearch: (query: string, page?: number) => Promise<void>;
  totalResults: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  suggestions: string[];
  apiHealthy: boolean;
}

const defaultFilters: SearchFilter = {
  timeRange: 'any',
  contentType: 'any',
  sortBy: 'relevance',
};

// Create context with a default value
const SearchContext = createContext<SearchContextType | undefined>(undefined);

// Custom provider component
export const SearchContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilter>(defaultFilters);

  const [totalResults, setTotalResults] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [apiHealthy, setApiHealthy] = useState<boolean>(true);

  // Check API health on mount
  useEffect(() => {
    const checkApiHealth = async () => {
      const isHealthy = await searchApi.checkHealth();
      setApiHealthy(isHealthy);
    };
    checkApiHealth();
  }, []);

  // Function to perform search
  const performSearch = async (searchQuery: string, page: number = 1) => {
    try {
      setIsLoading(true);
      setQuery(searchQuery);
      setCurrentPage(page);
      
      const response = await searchApi.search(searchQuery, page, pageSize);
      
      setSearchResults(response.results || []);
      setTotalResults(response.total || 0);
      setSuggestions(response.suggest || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setTotalResults(0);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    query,
    setQuery,
    searchResults,
    setSearchResults,
    isLoading,
    setIsLoading,
    filters,
    setFilters,
    performSearch,
    totalResults,
    currentPage,
    setCurrentPage,
    pageSize,
    suggestions,
    apiHealthy
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
};

// Custom hook for using this context
export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchContextProvider');
  }
  return context;
};