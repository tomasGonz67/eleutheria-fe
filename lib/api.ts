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

// Throttle the auth-required banner so background 401s on a freshly-loaded
// page don't keep re-popping it after the user has dismissed or navigated.
let last401BannerAt = 0;

clientApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      error.message = 'You have been too active. Please wait before trying again.';
    }
    if (error.response?.status === 401) {
      // Only show the banner for write actions the user explicitly took
      // (post, edit, delete, toggle setting, etc.). Background reads on
      // public pages also 401 for unauthenticated visitors, but the user
      // hasn't done anything wrong by viewing them.
      const method = (error.config?.method || '').toUpperCase();
      const isWriteAction = method && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
      const now = Date.now();
      if (isWriteAction && now - last401BannerAt > 30000) {
        last401BannerAt = now;
        // Lazy-require so this module doesn't pull the store into SSR bundles.
        try {
          const { useChatStore } = require('@/store/chatStore');
          useChatStore
            .getState()
            .showNotification(
              'error',
              "You aren't authenticated. Please go back to the home page to log in.",
              false,
              undefined,
              'Home',
              '/'
            );
        } catch {
          // Store not available (SSR / early bootstrap) — drop silently.
        }
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err: any, fallback: string): string {
  if (err?.response?.status === 429) return err.message;
  return fallback;
}

export default clientApi;
