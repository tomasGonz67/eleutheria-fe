import { clientApi } from '../api';
import { CreateForumRequest, UpdateForumRequest, ForumResponse } from '../types';

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

/**
 * Update a forum (requires authentication and ownership)
 */
export async function updateForum(forumId: number, request: UpdateForumRequest): Promise<ForumResponse> {
  const { data } = await clientApi.put<ForumResponse>(`/api/forums/${forumId}`, request);
  return data;
}

/**
 * Delete a forum (requires authentication and ownership)
 */
export async function deleteForum(forumId: number): Promise<{ success: boolean; message: string }> {
  const { data } = await clientApi.delete(`/api/forums/${forumId}`);
  return data;
}
