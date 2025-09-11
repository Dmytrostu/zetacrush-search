import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'https://zetacrush-search-api.vercel.app';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});