import axios from 'axios';

// Client-side API instance (for CSR - includes cookies for authentication)
// Uses NEXT_PUBLIC_API_URL which is set to http://localhost/api in docker-compose
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const clientApi = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Sends cookies for authenticated requests
  headers: {
    'Content-Type': 'application/json',
  },
});

export default clientApi;
