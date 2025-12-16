import { clientApi } from '../api';
import { CreateForumRequest, ForumResponse } from '../types';

/**
 * Search forums by name or description (client-side)
 */
export async function searchForums(query: string) {
  const { data } = await clientApi.get(`/api/forums/search?q=${encodeURIComponent(query)}`);
  return data;
}

/**
 * Create a new forum (requires authentication)
 */
export async function createForum(request: CreateForumRequest): Promise<ForumResponse> {
  const { data } = await clientApi.post<ForumResponse>('/api/forums/create', request);
  return data;
}
