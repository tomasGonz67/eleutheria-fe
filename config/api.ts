export const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')
  : (process.env.NEXT_PUBLIC_API_URL || 'https://api.eleutheria.com');

export const API_ENDPOINTS = {
  // Posts
  getPosts: (forumId: number, page: number = 1, limit: number = 20) => 
    `${API_BASE_URL}/api/forums/${forumId}/posts?page=${page}&limit=${limit}`,
  getPost: (forumId: number, postId: number) => 
    `${API_BASE_URL}/api/forums/${forumId}/posts/${postId}`,
  getComments: (forumId: number, parentId: number) =>
    `${API_BASE_URL}/api/forums/${forumId}/posts?parent_id=${parentId}`,
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
