export interface SearchHighlights {
  title?: string[];
  text?: string[];
}

export interface SearchResult {
  id: string;
  title: string;
  text: string;
  contributor?: string;
  timestamp?: string;
  score: number;
  highlights?: SearchHighlights;
  
  // Additional fields to maintain compatibility with existing UI
  url?: string;
  description?: string;
  createdAt?: string;
}

export interface SearchResponse {
  total: number;
  page: number;
  page_size: number;
  results: SearchResult[];
  suggest?: string[];
}

export interface SearchFilter {
  timeRange?: 'any' | 'past24h' | 'pastWeek' | 'pastMonth' | 'pastYear';
  contentType?: 'any' | 'articles' | 'videos' | 'images';
  sortBy?: 'relevance' | 'date';
}