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

clientApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      error.message = 'You have been too active. Please wait before trying again.';
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err: any, fallback: string): string {
  if (err?.response?.status === 429) return err.message;
  return fallback;
}

export default clientApi;
