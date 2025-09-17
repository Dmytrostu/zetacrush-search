import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api';

export interface SearchResult {
  id: string;
  title: string;
  text: string;
  contributor?: string;
  timestamp?: string;
  score: number;
  highlights?: {
    title?: string[];
    text?: string[];
  };
  url?: string;
}

export interface SearchResponse {
  total: number;
  page: number;
  page_size: number;
  results: SearchResult[];
  suggest?: string[];
}

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  searchResults: SearchResult[];
  setSearchResults: (results: SearchResult[]) => void;
  totalResults: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  suggestions: string[];
  setSuggestions: (suggestions: string[]) => void;
  fetchSuggestions: (query: string) => Promise<string[]>;
  performSearch: (query: string, page?: number, pageSize?: number) => Promise<void>;
  apiHealthy: boolean;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [apiHealthy, setApiHealthy] = useState(true);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Use refs to track if we've already processed URL params
  const hasProcessedUrlParams = useRef(false);
  const lastSearchQuery = useRef('');

  // Check API health on component mount ONCE
  useEffect(() => {
    checkApiHealth();
    // Reduce frequency - check every 30 minutes instead of 5
    const interval = setInterval(checkApiHealth, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []); // Empty dependency array

  // Function to check API health
  const checkApiHealth = async () => {
    try {
      const response = await apiClient.get('/api/health');
      setApiHealthy(response.data?.status === 'ok' && response.data?.elasticsearch === true);
    } catch (error) {
      console.error('API health check failed:', error);
      setApiHealthy(false);
    }
  };

  // Parse URL parameters ONCE on mount or when URL changes
  useEffect(() => {
    const queryParam = searchParams.get('query');
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');

    // Prevent duplicate processing
    if (hasProcessedUrlParams.current && queryParam === lastSearchQuery.current) {
      return;
    }

    // Update state from URL params
    if (queryParam) {
      setQuery(queryParam);
      lastSearchQuery.current = queryParam;
    }

    if (pageParam) {
      setCurrentPage(parseInt(pageParam, 10) || 1);
    }

    if (pageSizeParam) {
      setPageSize(parseInt(pageSizeParam, 10) || 10);
    }

    // Perform search if we have a query and haven't processed it yet
    if (queryParam && !hasProcessedUrlParams.current) {
      hasProcessedUrlParams.current = true;
      performSearchInternal(
        queryParam,
        pageParam ? parseInt(pageParam, 10) : 1,
        pageSizeParam ? parseInt(pageSizeParam, 10) : 10,
        false // Don't navigate since we're already on the right URL
      );
    }
  }, [searchParams.toString()]); // Use toString() to avoid object reference issues

  // Internal search function that doesn't navigate
  const performSearchInternal = async (
    searchQuery: string, 
    page = 1, 
    size = 10, 
    shouldNavigate = true
  ) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setTotalResults(0);
      setSuggestions([]);
      return;
    }

    // Prevent duplicate searches
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post('/api/search', {
        query: searchQuery,
        page,
        page_size: size
      });

      const data = response.data;

      // Process results to add Wikipedia URLs
      const processedResults = (data.results || []).map((result: SearchResult) => ({
        ...result,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))}`
      }));

      setSearchResults(processedResults);
      setTotalResults(data.total || 0);
      setCurrentPage(data.page || 1);
      setPageSize(data.page_size || 10);
      setSuggestions(data.suggest || []);

      // Only navigate if requested (not when loading from URL)
      if (shouldNavigate) {
        const params = new URLSearchParams();
        params.set('query', searchQuery);
        params.set('page', page.toString());
        params.set('pageSize', size.toString());

        navigate({
          pathname: '/results',
          search: params.toString()
        });
      }

      // Search was successful, so API is healthy
      setApiHealthy(true);
    } catch (error) {
      console.error('Error performing search:', error);
      setSearchResults([]);
      setTotalResults(0);
      setSuggestions([]);

      // Don't check API health on every failed search
      // checkApiHealth();
    } finally {
      setIsLoading(false);
    }
  };

  // Public search function that always navigates
  const performSearch = useCallback(async (searchQuery: string, page = 1, size = 10) => {
    hasProcessedUrlParams.current = false; // Reset flag for new searches
    await performSearchInternal(searchQuery, page, size, true);
  }, []);

  // Debounced suggestion fetching
  const fetchSuggestions = useCallback(async (queryText: string): Promise<string[]> => {
    if (!queryText.trim()) {
      setSuggestions([]);
      return [];
    }

    try {
      // Optional: Remove this if you don't need suggestions
      // const response = await apiClient.get('/api/suggest', {
      //   params: {
      //     query: queryText,
      //   }
      // });

      // const suggestionsData = response.data.suggestions || [];
      // setSuggestions(suggestionsData);
      // return suggestionsData;
      
      // For now, return empty to reduce API calls
      return [];
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      return [];
    }
  }, []);

  return (
    <SearchContext.Provider value={{
      query,
      setQuery,
      searchResults,
      setSearchResults,
      totalResults,
      currentPage,
      setCurrentPage,
      pageSize,
      setPageSize,
      isLoading,
      setIsLoading,
      suggestions,
      setSuggestions,
      fetchSuggestions,
      performSearch,
      apiHealthy
    }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};