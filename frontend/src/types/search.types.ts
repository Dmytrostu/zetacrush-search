export interface SearchResult {
  id: string;
  title: string;
  url: string;
  description: string;
  createdAt?: string;
}

export interface SearchFilter {
  timeRange?: 'any' | 'past24h' | 'pastWeek' | 'pastMonth' | 'pastYear';
  contentType?: 'any' | 'articles' | 'videos' | 'images';
  sortBy?: 'relevance' | 'date';
}