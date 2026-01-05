// Detect if we're running on server (SSR) or client (browser)
const isServer = typeof window === 'undefined';

// Use SERVER_API_URL for SSR (Docker network), NEXT_PUBLIC_API_URL for browser
export const API_BASE_URL = isServer
  ? (process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');

export const API_ENDPOINTS = {
  // Posts
  getPosts: (forumId: number, page: number = 1, limit: number = 20) =>
    `${API_BASE_URL}/api/forums/${forumId}/posts?page=${page}&limit=${limit}`,
  getComments: (forumId: number, parentId: number) =>
    `${API_BASE_URL}/api/forums/${forumId}/posts?parent_id=${parentId}`,
  searchPosts: (forumId: number, query: string, page: number = 1, limit: number = 20) =>
    `${API_BASE_URL}/api/forums/${forumId}/posts/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
  createPost: (forumId: number) => `${API_BASE_URL}/api/forums/${forumId}/posts`,

  // Forums
  getForums: (page: number = 1, limit: number = 20) =>
    `${API_BASE_URL}/api/forums?page=${page}&limit=${limit}`,
  searchForums: (query: string, page: number = 1, limit: number = 20) =>
    `${API_BASE_URL}/api/forums/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,

  // Chat
  matchRandom: () => `${API_BASE_URL}/api/chat/match/random`,
  matchPlanned: () => `${API_BASE_URL}/api/chat/match/planned`,
  sendChatMessage: (sessionId: number) => `${API_BASE_URL}/api/chat/${sessionId}/messages`,
  getChatMessages: (sessionId: number) => `${API_BASE_URL}/api/chat/${sessionId}/messages`,

  // Chatrooms
  getChatrooms: (page: number = 1, limit: number = 20) => 
    `${API_BASE_URL}/api/chatrooms?page=${page}&limit=${limit}`,
  searchChatrooms: (query: string, page: number = 1, limit: number = 20) => 
    `${API_BASE_URL}/api/chatrooms/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
  createChatroom: () => `${API_BASE_URL}/api/chatrooms/create`,
  getChatroomMessages: (chatroomId: number) => `${API_BASE_URL}/api/chatrooms/${chatroomId}/messages`,
};
