import { clientApi } from '../api';
import { CreateChatroomRequest, ChatroomResponse, CreateChatroomMessageRequest, ChatroomMessageResponse } from '../types';

/**
 * Create a new chatroom (requires authentication)
 */
export async function createChatroom(request: CreateChatroomRequest): Promise<ChatroomResponse> {
  const { data } = await clientApi.post<ChatroomResponse>('/api/chatrooms', request);
  return data;
}

/**
 * Send a message to a chatroom (requires authentication)
 */
export async function createChatroomMessage(chatroomId: number, request: CreateChatroomMessageRequest): Promise<ChatroomMessageResponse> {
  const { data } = await clientApi.post<ChatroomMessageResponse>(`/api/chatrooms/${chatroomId}/messages`, request);
  return data;
}
