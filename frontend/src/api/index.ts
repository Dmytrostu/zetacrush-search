import { apiClient } from './apiClient';
import { ENDPOINTS } from './endpoints';
import { SearchResult } from '../types/search.types';

export const searchApi = {
  search: async (query: string): Promise<SearchResult[]> => {
    const response = await apiClient.get(`${ENDPOINTS.SEARCH}?q=${encodeURIComponent(query)}`);
    return response.data.results;
  },
  
  getSuggestions: async (query: string): Promise<string[]> => {
    const response = await apiClient.get(`${ENDPOINTS.SUGGEST}?q=${encodeURIComponent(query)}`);
    return response.data.suggestions;
  }
};

export { ENDPOINTS };