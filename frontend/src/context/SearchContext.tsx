import React, { createContext, useState, useContext, ReactNode } from 'react';
import { SearchResult, SearchFilter } from '../types/search.types';
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
  performSearch: (query: string) => Promise<void>;
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

  // Function to perform search
  const performSearch = async (searchQuery: string) => {
    try {
      setIsLoading(true);
      setQuery(searchQuery);
      
      const results = await searchApi.search(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
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
    performSearch
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