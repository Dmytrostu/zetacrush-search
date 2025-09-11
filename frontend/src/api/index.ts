import { apiClient } from './apiClient';
import { ENDPOINTS } from './endpoints';
import { SearchResult, SearchResponse } from '../types/search.types';

export const searchApi = {
  search: async (query: string, page: number = 1, pageSize: number = 10): Promise<SearchResponse> => {
    const response = await apiClient.get(ENDPOINTS.SEARCH, {
      params: {
        query: query,
        page: page,
        page_size: pageSize
      }
    });
    
    // Process the results to add url field for compatibility with existing UI
    const data = response.data;
    if (data.results) {
      data.results = data.results.map((result: SearchResult) => ({
        ...result,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))}`,
        description: result.text,
        createdAt: result.timestamp
      }));
    }
    
    return data;
  },
  
  checkHealth: async (): Promise<boolean> => {
    try {
      const response = await apiClient.get(ENDPOINTS.HEALTH);
      return response.data.status === 'ok';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
};

export { ENDPOINTS };