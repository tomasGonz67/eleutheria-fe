import { clientApi } from '../api';
import { ChatSessionResponse, CreateChatMessageRequest, ChatMessageResponse } from '../types';

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
export async function matchPlanned(targetSessionToken: string): Promise<ChatSessionResponse> {
  const { data } = await clientApi.post<ChatSessionResponse>('/api/chat/match/planned', {
    target_session_token: targetSessionToken,
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
  const { data } = await clientApi.post(`/api/chat/${sessionId}/reject`);
  return data;
}

/**
 * Cancel a planned chat request (requires authentication, only requester can cancel)
 */
export async function cancelChatRequest(sessionId: number): Promise<{ success: boolean; message: string }> {
  const { data } = await clientApi.post(`/api/chat/${sessionId}/cancel`);
  return data;
}

/**
 * Send a message in a chat session (requires authentication)
 */
export async function createChatMessage(sessionId: number, request: CreateChatMessageRequest): Promise<ChatMessageResponse> {
  const { data } = await clientApi.post<ChatMessageResponse>(`/api/chat/${sessionId}/messages`, request);
  return data;
}
