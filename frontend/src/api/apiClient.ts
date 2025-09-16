import axios from 'axios';

// const BASE_URL = process.env.REACT_APP_API_URL || 'https://zetacrush-search-api.vercel.app';
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});