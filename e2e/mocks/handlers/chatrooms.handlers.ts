// Chatrooms API mock handlers

import { Page, Route } from '@playwright/test';
import { ChatroomsState } from '../data/chatrooms.data';
import { SessionState } from '../data/session.data';
import { ErrorResponse } from '../data/errors.data';

export interface ChatroomsHandlerOptions {
  chatroomsState: ChatroomsState;
  sessionState: SessionState;
  errors?: Map<string, ErrorResponse>;
  delays?: Map<string, number>;
}

export function setupChatroomsHandlers(page: Page, options: ChatroomsHandlerOptions) {
  const { chatroomsState, sessionState, errors = new Map(), delays = new Map() } = options;

  const applyDelay = async (endpoint: string) => {
    const delay = delays.get(endpoint);
    if (delay) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  };

  const checkError = (route: Route, endpoint: string): boolean => {
    const error = errors.get(endpoint);
    if (error) {
      route.fulfill({
        status: error.status,
        contentType: 'application/json',
        body: JSON.stringify(error.body),
      });
      return true;
    }
    return false;
  };

  // GET /api/chatrooms - List chatrooms (paginated)
  page.route(/\/api\/chatrooms(\?|$)/, async (route) => {
    const url = new URL(route.request().url());

    // Skip if this is a create, search, or specific chatroom endpoint
    if (url.pathname.includes('/create') || url.pathname.includes('/search') || /\/api\/chatrooms\/\d+/.test(url.pathname)) {
      return route.continue();
    }

    await applyDelay('/api/chatrooms');
    if (checkError(route, '/api/chatrooms')) return;

    const page_num = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    const result = chatroomsState.getPaginated(page_num, limit);

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(result),
    });
  });

  // GET /api/chatrooms/search - Search chatrooms
  page.route('**/api/chatrooms/search*', async (route) => {
    await applyDelay('/api/chatrooms/search');
    if (checkError(route, '/api/chatrooms/search')) return;

    const url = new URL(route.request().url());
    const query = url.searchParams.get('q') || '';
    const page_num = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    const result = chatroomsState.search(query, page_num, limit);

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(result),
    });
  });

  // POST /api/chatrooms/create - Create chatroom
  page.route('**/api/chatrooms/create', async (route) => {
    await applyDelay('/api/chatrooms/create');
    if (checkError(route, '/api/chatrooms/create')) return;

    const user = sessionState.getCurrentUser();
    if (!user) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }

    let name: string;
    let description: string;

    try {
      const body = await route.request().postDataJSON();
      name = body?.name?.trim();
      description = body?.description?.trim() || '';
    } catch {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Bad Request', message: 'Invalid request body' }),
      });
    }

    // Validation
    if (!name || name.length === 0) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation Error',
          details: { name: 'Chatroom name is required' },
        }),
      });
    }

    if (name.length > 50) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation Error',
          details: { name: 'Chatroom name must be 50 characters or less' },
        }),
      });
    }

    if (description.length > 200) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation Error',
          details: { description: 'Description must be 200 characters or less' },
        }),
      });
    }

    const chatroom = chatroomsState.create(name, description, user.id, user.username);

    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ chatroom }),
    });
  });

  // GET /api/chatrooms/:id - Get single chatroom
  page.route(/\/api\/chatrooms\/(\d+)$/, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();

    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/chatrooms\/(\d+)$/);
    if (!match) return route.continue();

    const chatroomId = parseInt(match[1], 10);
    await applyDelay(`/api/chatrooms/${chatroomId}`);
    if (checkError(route, `/api/chatrooms/${chatroomId}`)) return;

    const chatroom = chatroomsState.getById(chatroomId);

    if (!chatroom) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found', message: 'Chatroom not found' }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ chatroom }),
    });
  });

  // PUT /api/chatrooms/:id - Update chatroom
  page.route(/\/api\/chatrooms\/(\d+)$/, async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();

    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/chatrooms\/(\d+)$/);
    if (!match) return route.continue();

    const chatroomId = parseInt(match[1], 10);
    await applyDelay(`/api/chatrooms/${chatroomId}/edit`);
    if (checkError(route, `/api/chatrooms/${chatroomId}/edit`)) return;

    const user = sessionState.getCurrentUser();
    if (!user) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }

    const chatroom = chatroomsState.getById(chatroomId);
    if (!chatroom) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found', message: 'Chatroom not found' }),
      });
    }

    // Check ownership
    if (chatroom.created_by !== user.id) {
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden', message: 'You can only edit your own chatrooms' }),
      });
    }

    let name: string | undefined;
    let description: string | undefined;

    try {
      const body = await route.request().postDataJSON();
      name = body?.name?.trim();
      description = body?.description?.trim();
    } catch {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Bad Request', message: 'Invalid request body' }),
      });
    }

    // Validation
    if (name !== undefined && name.length > 50) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation Error',
          details: { name: 'Chatroom name must be 50 characters or less' },
        }),
      });
    }

    const updated = chatroomsState.update(chatroomId, { name, description });

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ chatroom: updated }),
    });
  });

  // DELETE /api/chatrooms/:id - Delete chatroom
  page.route(/\/api\/chatrooms\/(\d+)$/, async (route) => {
    if (route.request().method() !== 'DELETE') return route.continue();

    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/chatrooms\/(\d+)$/);
    if (!match) return route.continue();

    const chatroomId = parseInt(match[1], 10);
    await applyDelay(`/api/chatrooms/${chatroomId}/delete`);
    if (checkError(route, `/api/chatrooms/${chatroomId}/delete`)) return;

    const user = sessionState.getCurrentUser();
    if (!user) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }

    const chatroom = chatroomsState.getById(chatroomId);
    if (!chatroom) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found', message: 'Chatroom not found' }),
      });
    }

    // Check ownership
    if (chatroom.created_by !== user.id) {
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden', message: 'You can only delete your own chatrooms' }),
      });
    }

    chatroomsState.delete(chatroomId);

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // GET /api/chatrooms/:id/messages - Get chatroom messages
  page.route(/\/api\/chatrooms\/(\d+)\/messages$/, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();

    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/chatrooms\/(\d+)\/messages$/);
    if (!match) return route.continue();

    const chatroomId = parseInt(match[1], 10);
    await applyDelay(`/api/chatrooms/${chatroomId}/messages`);
    if (checkError(route, `/api/chatrooms/${chatroomId}/messages`)) return;

    const messages = chatroomsState.getMessages(chatroomId);

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ messages }),
    });
  });

  // POST /api/chatrooms/:id/messages - Send message to chatroom
  page.route(/\/api\/chatrooms\/(\d+)\/messages$/, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();

    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/chatrooms\/(\d+)\/messages$/);
    if (!match) return route.continue();

    const chatroomId = parseInt(match[1], 10);
    await applyDelay(`/api/chatrooms/${chatroomId}/messages/send`);
    if (checkError(route, `/api/chatrooms/${chatroomId}/messages/send`)) return;

    const user = sessionState.getCurrentUser();
    if (!user) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }

    let content: string;

    try {
      const body = await route.request().postDataJSON();
      content = body?.content?.trim();
    } catch {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Bad Request', message: 'Invalid request body' }),
      });
    }

    if (!content || content.length === 0) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation Error',
          details: { content: 'Message content is required' },
        }),
      });
    }

    const message = chatroomsState.addMessage(chatroomId, user.id, user.username, content);

    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ message }),
    });
  });
}
