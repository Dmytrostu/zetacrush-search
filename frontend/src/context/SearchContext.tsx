import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
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
  const [apiHealthy, setApiHealthy] = useState(true); // Default to true until proven otherwise

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Check API health on component mount
  useEffect(() => {
    checkApiHealth();
    // Set up interval to check API health periodically (every 5 minutes)
    const interval = setInterval(checkApiHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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

  // Parse URL parameters on mount or location change
  useEffect(() => {
    const queryParam = searchParams.get('query');
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');

    // Only set the query if it exists in the URL and is different from current query
    if (queryParam && queryParam !== query) {
      setQuery(queryParam);
    }

    // Set page if it exists in the URL
    if (pageParam) {
      setCurrentPage(parseInt(pageParam, 10) || 1);
    }

    // Set page size if it exists in the URL
    if (pageSizeParam) {
      setPageSize(parseInt(pageSizeParam, 10) || 10);
    }

    // If we have a query from the URL, perform the search
    if (queryParam) {
      performSearch(
        queryParam,
        pageParam ? parseInt(pageParam, 10) : 1,
        pageSizeParam ? parseInt(pageSizeParam, 10) : 10
      );
    }
  }, [searchParams, query]);


  const performSearch = async (searchQuery: string, page = 1, size = 10) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setTotalResults(0);
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.get('/api/search', {
        params: {
          query: searchQuery,
          page,
          page_size: size
        }
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

      // Always navigate to the results page with the correct query parameters
      const params = new URLSearchParams();
      params.set('query', searchQuery);
      params.set('page', page.toString());
      params.set('pageSize', size.toString());

      // Use navigate instead of setSearchParams to ensure it works from any page
      navigate({
        pathname: '/results',
        search: params.toString()
      });

      // Search was successful, so API is healthy
      setApiHealthy(true);
    } catch (error) {
      console.error('Error performing search:', error);
      setSearchResults([]);
      setTotalResults(0);
      setSuggestions([]);

      // Search failed, so API might be unhealthy
      checkApiHealth();
    } finally {
      setIsLoading(false);
    }
  };


  // Function to fetch only suggestions without performing search
  const fetchSuggestions = async (queryText: string): Promise<string[]> => {
    if (!queryText.trim()) {
      setSuggestions([]);
      return [];
    }

    try {
      const response = await apiClient.get('/api/suggest', {
        params: {
          query: queryText,
        }
      });

      const suggestionsData = response.data.suggestions || [];
      setSuggestions(suggestionsData);
      return suggestionsData;
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      return [];
    }
  };

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