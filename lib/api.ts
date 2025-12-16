import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Client-side API instance (for CSR - includes cookies for authentication)
export const clientApi = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Sends cookies for authenticated requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Server-side API instance (for SSR - simple GET requests, no auth needed)
export const serverApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default clientApi;
