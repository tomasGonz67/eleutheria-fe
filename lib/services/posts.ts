import { clientApi } from '../api';
import { CreatePostRequest, UpdatePostRequest, PostResponse } from '../types';

/**
 * Search posts within a forum (client-side)
 */
export async function searchPosts(forumId: number, query: string) {
  const { data } = await clientApi.get(`/api/forums/${forumId}/posts/search?q=${encodeURIComponent(query)}`);
  return data;
}

/**
 * Create a new post in a forum (requires authentication)
 */
export async function createPost(forumId: number, request: CreatePostRequest): Promise<PostResponse> {
  const { data } = await clientApi.post<PostResponse>(`/api/forums/${forumId}/posts`, request);
  return data;
}

/**
 * Update a post (requires authentication and ownership)
 */
export async function updatePost(forumId: number, postId: number, request: UpdatePostRequest): Promise<PostResponse> {
  const { data } = await clientApi.put<PostResponse>(`/api/forums/${forumId}/posts/${postId}`, request);
  return data;
}

/**
 * Delete a post (requires authentication and ownership)
 */
export async function deletePost(forumId: number, postId: number): Promise<{ success: boolean; message: string }> {
  const { data } = await clientApi.delete(`/api/forums/${forumId}/posts/${postId}`);
  return data;
}
