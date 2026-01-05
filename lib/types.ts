// Session and User Types
export interface AnonymousUser {
  session_token: string;
  username: string | null;
  discriminator: string;
  ip: string;
  fingerprint: string;
  user_agent: string;
  created_at: string;
  last_active: string;
  notifications?: number;
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
  parent_id?: number;
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

export interface UpdateChatroomRequest {
  name: string;
  description?: string;
}

export interface ChatroomMessage {
  id: number;
  chatroom_id: number;
  sender_discriminator: string;
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
  user1_username: string;
  user2_username: string;
  user1_discriminator: string;
  user2_discriminator: string | null;
  status: 'waiting' | 'active' | 'ended';
  type: 'random' | 'planned';
  created_at: string;
  matched_at?: string | null;
  ended_at: string | null;
}

export interface ChatSessionResponse {
  session: ChatSession;
}

export interface ChatMessage {
  id: number;
  chat_session_id: number;
  sender_discriminator: string;
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

// ============================================================================
// VIEW MODELS (for components - different from API responses)
// ============================================================================

// Message for chat UI (includes is_me flag)
export interface Message {
  id: number;
  content: string;
  username: string; // Sender's username
  is_me: boolean; // Whether this message is from the current user
  sender_discriminator?: string; // Sender's discriminator
  created_at: string;
  isSystem?: boolean; // For system messages like "User left"
}

export interface MessageRequest {
  session_id: number;
  requester_username: string;
  requester_discriminator: string;
  created_at: string;
}

// FeedPost (for feed and forum posts with user info)
export interface FeedPost {
  id: number;
  content: string;
  username: string;
  author_discriminator: string;
  is_my_post: boolean;
  created_at: string;
  comment_count?: number;
  parent_id?: number | null; // For comments/replies
}

// Forum with additional UI fields
export interface ForumWithCounts extends Forum {
  post_count?: number;
  creator_username?: string;
  creator_discriminator?: string;
  is_my_forum?: boolean;
}

// Chatroom with additional UI fields
export interface ChatroomWithUsers extends Chatroom {
  creator_discriminator: string | null;
  creator_username?: string;
  user_count?: number;
}

// ChatSession with additional UI fields
export interface ChatSessionWithUI extends ChatSession {
  partner_username?: string;
  partner_discriminator?: string;
  invite_code?: string;
  messages_count?: number;
}
