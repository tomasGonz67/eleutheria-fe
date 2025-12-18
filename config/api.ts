export const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000'
  : process.env.NEXT_PUBLIC_API_URL || 'https://api.eleutheria.com'; // Update with your prod URL later

export const API_ENDPOINTS = {
  // Posts
  getPosts: (forumId: number, page: number = 1, limit: number = 20) => 
    `${API_BASE_URL}/api/forums/${forumId}/posts?page=${page}&limit=${limit}`,
  searchPosts: (forumId: number, query: string, page: number = 1, limit: number = 20) =>
    `${API_BASE_URL}/api/forums/${forumId}/posts/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
  createPost: (forumId: number) => `${API_BASE_URL}/api/forums/${forumId}/posts`,

  // Forums
  getForums: (page: number = 1, limit: number = 20) => 
    `${API_BASE_URL}/api/forums?page=${page}&limit=${limit}`,
  getForum: (forumId: number) => `${API_BASE_URL}/api/forums/${forumId}`,
  createForum: () => `${API_BASE_URL}/api/forums`,
  searchForums: (query: string, page: number = 1, limit: number = 20) => 
    `${API_BASE_URL}/api/forums/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,

  // Chat
  matchRandom: () => `${API_BASE_URL}/api/chat/match-random`,
  matchPlanned: () => `${API_BASE_URL}/api/chat/match-planned`,

  // Chatrooms
  getChatrooms: () => `${API_BASE_URL}/api/chatrooms`,
  createChatroom: () => `${API_BASE_URL}/api/chatrooms/create`,
  getChatroomMessages: (chatroomId: number) => `${API_BASE_URL}/api/chatrooms/${chatroomId}/messages`,
};
