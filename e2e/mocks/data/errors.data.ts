// Error response templates for API mocking

export interface ErrorResponse {
  status: number;
  body: {
    error: string;
    message?: string;
    details?: Record<string, string>;
  };
}

// Common HTTP errors
export const errors = {
  // 400 Bad Request
  badRequest: (message: string = 'Bad request'): ErrorResponse => ({
    status: 400,
    body: { error: 'Bad Request', message },
  }),

  // 400 Validation Error
  validation: (details: Record<string, string>): ErrorResponse => ({
    status: 400,
    body: { error: 'Validation Error', message: 'Invalid input', details },
  }),

  // 401 Unauthorized
  unauthorized: (message: string = 'Unauthorized'): ErrorResponse => ({
    status: 401,
    body: { error: 'Unauthorized', message },
  }),

  // 403 Forbidden
  forbidden: (message: string = 'You do not have permission to perform this action'): ErrorResponse => ({
    status: 403,
    body: { error: 'Forbidden', message },
  }),

  // 404 Not Found
  notFound: (resource: string = 'Resource'): ErrorResponse => ({
    status: 404,
    body: { error: 'Not Found', message: `${resource} not found` },
  }),

  // 409 Conflict
  conflict: (message: string = 'Resource already exists'): ErrorResponse => ({
    status: 409,
    body: { error: 'Conflict', message },
  }),

  // 500 Internal Server Error
  serverError: (message: string = 'Internal server error'): ErrorResponse => ({
    status: 500,
    body: { error: 'Internal Server Error', message },
  }),

  // 502 Bad Gateway
  badGateway: (): ErrorResponse => ({
    status: 502,
    body: { error: 'Bad Gateway', message: 'Service temporarily unavailable' },
  }),

  // 503 Service Unavailable
  serviceUnavailable: (): ErrorResponse => ({
    status: 503,
    body: { error: 'Service Unavailable', message: 'Service is temporarily unavailable' },
  }),

  // 504 Gateway Timeout
  timeout: (): ErrorResponse => ({
    status: 504,
    body: { error: 'Gateway Timeout', message: 'Request timed out' },
  }),
};

// Specific error scenarios for different features
export const sessionErrors = {
  invalidUsername: errors.validation({ username: 'Username must be between 1 and 20 characters' }),
  usernameTaken: errors.conflict('Username already taken'),
  sessionExpired: errors.unauthorized('Session has expired'),
  sessionNotFound: errors.notFound('Session'),
};

export const forumErrors = {
  emptyName: errors.validation({ name: 'Forum name is required' }),
  nameTooLong: errors.validation({ name: 'Forum name must be 100 characters or less' }),
  descriptionTooLong: errors.validation({ description: 'Description must be 500 characters or less' }),
  forumNotFound: errors.notFound('Forum'),
  notOwner: errors.forbidden('You can only edit your own forums'),
  createFailed: errors.serverError('Failed to create forum'),
};

export const postErrors = {
  emptyContent: errors.validation({ content: 'Post content is required' }),
  contentTooLong: errors.validation({ content: 'Post content must be 10000 characters or less' }),
  postNotFound: errors.notFound('Post'),
  forumNotFound: errors.notFound('Forum'),
  notOwner: errors.forbidden('You can only edit your own posts'),
};

export const chatroomErrors = {
  emptyName: errors.validation({ name: 'Chatroom name is required' }),
  nameTooLong: errors.validation({ name: 'Chatroom name must be 50 characters or less' }),
  chatroomNotFound: errors.notFound('Chatroom'),
  notOwner: errors.forbidden('You can only edit your own chatrooms'),
  createFailed: errors.serverError('Failed to create chatroom'),
};

export const chatErrors = {
  sessionNotFound: errors.notFound('Chat session'),
  notParticipant: errors.forbidden('You are not a participant in this chat'),
  chatEnded: errors.badRequest('Chat has already ended'),
  cannotMessage: errors.badRequest('Cannot send message to this chat'),
  matchFailed: errors.serverError('Failed to find a chat partner'),
};
