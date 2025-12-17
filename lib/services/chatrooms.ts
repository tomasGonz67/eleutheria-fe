import { clientApi } from '../api';
import { CreateChatroomRequest, ChatroomResponse, CreateChatroomMessageRequest, ChatroomMessageResponse, UpdateChatroomRequest } from '../types';

/**
 * Create a new chatroom (requires authentication)
 */
export async function createChatroom(request: CreateChatroomRequest): Promise<ChatroomResponse> {
  const { data } = await clientApi.post<ChatroomResponse>('/api/chatrooms/create', request);
  return data;
}

/**
 * Update a chatroom (requires authentication and ownership)
 */
export async function updateChatroom(chatroomId: number, request: UpdateChatroomRequest): Promise<ChatroomResponse> {
  const { data } = await clientApi.put<ChatroomResponse>(`/api/chatrooms/${chatroomId}`, request);
  return data;
}

/**
 * Delete a chatroom (requires authentication and ownership)
 */
export async function deleteChatroom(chatroomId: number): Promise<{ success: boolean; message: string }> {
  const { data } = await clientApi.delete(`/api/chatrooms/${chatroomId}`);
  return data;
}

/**
 * Send a message to a chatroom (requires authentication)
 */
export async function createChatroomMessage(chatroomId: number, request: CreateChatroomMessageRequest): Promise<ChatroomMessageResponse> {
  const { data } = await clientApi.post<ChatroomMessageResponse>(`/api/chatrooms/${chatroomId}/messages`, request);
  return data;
}
