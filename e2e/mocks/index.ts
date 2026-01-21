// Export all mock data and handlers

// Data types and factories
export * from './data/session.data';
export * from './data/forums.data';
export * from './data/posts.data';
export * from './data/chatrooms.data';
export * from './data/chat.data';
export * from './data/errors.data';

// Handlers
export { setupSessionHandlers } from './handlers/session.handlers';
export type { SessionHandlerOptions } from './handlers/session.handlers';

export { setupForumsHandlers } from './handlers/forums.handlers';
export type { ForumsHandlerOptions } from './handlers/forums.handlers';

export { setupPostsHandlers } from './handlers/posts.handlers';
export type { PostsHandlerOptions } from './handlers/posts.handlers';

export { setupChatroomsHandlers } from './handlers/chatrooms.handlers';
export type { ChatroomsHandlerOptions } from './handlers/chatrooms.handlers';

export { setupChatHandlers } from './handlers/chat.handlers';
export type { ChatHandlerOptions } from './handlers/chat.handlers';

// Socket mock
export { setupSocketMock, injectSocketController } from './socket/socket-mock';
export type { SocketMockController } from './socket/socket-mock';
