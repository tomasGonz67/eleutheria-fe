// Session and User Types
export interface AnonymousUser {
  session_token: string;
  username: string | null;
  ip: string;
  fingerprint: string;
  user_agent: string;
  created_at: string;
  last_active: string;
}

export interface SessionResponse {
  user: AnonymousUser;
}

export interface LoginRequest {
  username: string;
}

export interface LoginResponse {
  success: boolean;
  user: AnonymousUser;
}

// Forum Types
export interface Forum {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface ForumsResponse {
  forums: Forum[];
}

export interface ForumResponse {
  forum: Forum;
}

export interface CreateForumRequest {
  name: string;
  description?: string;
}

export interface UpdateForumRequest {
  name?: string;
  description?: string;
}

// Post Types
export interface Snapshot {
  id: number;
  session_token: string;
  username: string | null;
  ip: string;
  fingerprint: string;
  user_agent: string;
  created_at: string;
}

export interface Post {
  id: number;
  forum_id: number;
  author_session_token: string;
  content: string;
  snapshot_id: number;
  created_at: string;
  updated_at: string;
  snapshot?: Snapshot;
}

export interface PostsResponse {
  posts: Post[];
}

export interface PostResponse {
  post: Post;
}

export interface CreatePostRequest {
  content: string;
}

export interface UpdatePostRequest {
  content: string;
}

// Chatroom Types
export interface Chatroom {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ChatroomsResponse {
  chatrooms: Chatroom[];
}

export interface ChatroomResponse {
  chatroom: Chatroom;
}

export interface CreateChatroomRequest {
  name: string;
  description?: string;
}

export interface ChatroomMessage {
  id: number;
  chatroom_id: number;
  sender_session_token: string;
  content: string;
  snapshot_id: number;
  created_at: string;
  snapshot?: Snapshot;
}

export interface ChatroomMessagesResponse {
  messages: ChatroomMessage[];
}

export interface ChatroomMessageResponse {
  success: boolean;
  message: ChatroomMessage;
}

export interface CreateChatroomMessageRequest {
  content: string;
}

// Chat Session Types
export interface ChatSession {
  id: number;
  user1_session_token: string;
  user2_session_token: string | null;
  status: 'waiting' | 'active' | 'ended';
  created_at: string;
  matched_at: string | null;
  ended_at: string | null;
}

export interface ChatSessionResponse {
  session: ChatSession;
}

export interface ChatMessage {
  id: number;
  chat_session_id: number;
  sender_session_token: string;
  receiver_session_token: string;
  content: string;
  sender_snapshot_id: number;
  receiver_snapshot_id: number;
  created_at: string;
  sender_snapshot?: Snapshot;
  receiver_snapshot?: Snapshot;
}

export interface ChatMessageResponse {
  success: boolean;
  message: ChatMessage;
}

export interface CreateChatMessageRequest {
  content: string;
}

// Error Response
export interface ErrorResponse {
  error: string;
}
