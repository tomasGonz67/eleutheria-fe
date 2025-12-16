import { clientApi } from '../api';
import { SessionResponse, AnonymousUser } from '../types';

/**
 * Create a new session or update existing session with username
 */
export async function createSession(username?: string): Promise<{ success: boolean; user: AnonymousUser; message?: string }> {
  const { data } = await clientApi.post('/api/session/create', username ? { username } : {});
  return data;
}

/**
 * Update username for current authenticated session
 */
export async function updateUsername(username: string): Promise<{ success: boolean; user: { username: string } }> {
  const { data } = await clientApi.put('/api/session/username', { username });
  return data;
}

/**
 * Get current user information (requires authentication)
 */
export async function getCurrentUser(): Promise<SessionResponse> {
  const { data } = await clientApi.get<SessionResponse>('/api/session/me');
  return data;
}
