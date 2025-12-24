import { clientApi } from '../api';
import { ChatSessionResponse, CreateChatMessageRequest, ChatMessageResponse } from '../types';

/**
 * Get all chat sessions for the current user (requires authentication)
 */
export async function getAllChatSessions(): Promise<{ sessions: any[] }> {
  const { data } = await clientApi.get('/api/chat/sessions');
  return data;
}

/**
 * Match with a random user for 1-on-1 chat (requires authentication)
 */
export async function matchRandom(): Promise<ChatSessionResponse> {
  const { data } = await clientApi.post<ChatSessionResponse>('/api/chat/match/random');
  return data;
}

/**
 * Match with a specific user for 1-on-1 chat (requires authentication)
 */
export async function matchPlanned(recipientId: string): Promise<ChatSessionResponse> {
  const { data } = await clientApi.post<ChatSessionResponse>('/api/chat/match/planned', {
    recipientId: recipientId,
  });
  return data;
}

/**
 * Accept a planned chat request (requires authentication, only invitee can accept)
 */
export async function acceptChatRequest(sessionId: number): Promise<ChatSessionResponse> {
  const { data } = await clientApi.post<ChatSessionResponse>(`/api/chat/${sessionId}/accept`);
  return data;
}

/**
 * Reject a planned chat request (requires authentication, only invitee can reject)
 */
export async function rejectChatRequest(sessionId: number): Promise<{ success: boolean; message: string }> {
  const { data } = await clientApi.delete(`/api/chat/${sessionId}/reject`);
  return data;
}

/**
 * Cancel a waiting chat session (requires authentication, only user who initiated can cancel)
 * Works for both random chat search and planned chat requests
 */
export async function cancelChatSession(sessionId: number): Promise<{ success: boolean; message: string }> {
  const { data } = await clientApi.delete(`/api/chat/${sessionId}/cancel`);
  return data;
}

/**
 * Send a message in a chat session (requires authentication)
 */
export async function createChatMessage(sessionId: number, request: CreateChatMessageRequest): Promise<ChatMessageResponse> {
  const { data} = await clientApi.post<ChatMessageResponse>(`/api/chat/${sessionId}/messages`, request);
  return data;
}

/**
 * End an active chat session (requires authentication)
 * Updates status to 'ended', preserves chat history
 */
export async function endChatSession(sessionId: number): Promise<{ success: boolean; message: string }> {
  const { data } = await clientApi.put(`/api/chat/${sessionId}/end`);
  return data;
}

/**
 * Delete a chat session completely (requires authentication)
 * Removes session from database
 */
export async function deleteChatSession(sessionId: number): Promise<{ success: boolean; message: string }> {
  const { data } = await clientApi.delete(`/api/chat/${sessionId}`);
  return data;
}
