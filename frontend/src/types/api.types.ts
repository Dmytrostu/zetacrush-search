export interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
}

export interface SearchRequest {
  query: string;
  filters?: {
    category?: string;
    priceRange?: [number, number];
  };
}