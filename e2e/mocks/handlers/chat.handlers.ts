// Chat (random/private) API mock handlers

import { Page, Route } from '@playwright/test';
import { ChatState } from '../data/chat.data';
import { SessionState } from '../data/session.data';
import { ErrorResponse } from '../data/errors.data';

export interface ChatHandlerOptions {
  chatState: ChatState;
  sessionState: SessionState;
  errors?: Map<string, ErrorResponse>;
  delays?: Map<string, number>;
}

export function setupChatHandlers(page: Page, options: ChatHandlerOptions) {
  const { chatState, sessionState, errors = new Map(), delays = new Map() } = options;

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

  // GET /api/chat/sessions - List user's chat sessions
  page.route('**/api/chat/sessions', async (route) => {
    await applyDelay('/api/chat/sessions');
    if (checkError(route, '/api/chat/sessions')) return;

    const user = sessionState.getCurrentUser();
    if (!user) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }

    const sessions = chatState.getUserSessions(user.id);

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ sessions }),
    });
  });

  // POST /api/chat/match/random - Start random chat
  page.route('**/api/chat/match/random', async (route) => {
    await applyDelay('/api/chat/match/random');
    if (checkError(route, '/api/chat/match/random')) return;

    const user = sessionState.getCurrentUser();
    if (!user) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }

    const { session, matched } = chatState.startRandomChat(user.id, user.username);

    let response: Record<string, unknown> = { session };

    if (matched && session.user2_id) {
      // User was matched with someone waiting
      const partnerId = session.user1_id === user.id ? session.user2_id : session.user1_id;
      const partnerUsername = session.user1_id === user.id ? session.user2_username : session.user1_username;
      response.partner = { id: partnerId, username: partnerUsername };
    }

    return route.fulfill({
      status: matched ? 200 : 201,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });

  // POST /api/chat/match/planned - Start planned chat with specific user
  page.route('**/api/chat/match/planned', async (route) => {
    await applyDelay('/api/chat/match/planned');
    if (checkError(route, '/api/chat/match/planned')) return;

    const user = sessionState.getCurrentUser();
    if (!user) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }

    let targetUserId: number;
    let targetUsername: string;

    try {
      const body = await route.request().postDataJSON();
      targetUserId = body?.target_user_id;
      targetUsername = body?.target_username || `User${targetUserId}`;
    } catch {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Bad Request', message: 'Invalid request body' }),
      });
    }

    if (!targetUserId) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation Error',
          details: { target_user_id: 'Target user ID is required' },
        }),
      });
    }

    const session = chatState.startPlannedChat(user.id, user.username, targetUserId, targetUsername);

    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ session }),
    });
  });

  // PUT /api/chat/:sessionId/accept - Accept chat request
  page.route(/\/api\/chat\/(\d+)\/accept$/, async (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/chat\/(\d+)\/accept$/);
    if (!match) return route.continue();

    const sessionId = parseInt(match[1], 10);
    await applyDelay(`/api/chat/${sessionId}/accept`);
    if (checkError(route, `/api/chat/${sessionId}/accept`)) return;

    const user = sessionState.getCurrentUser();
    if (!user) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }

    const session = chatState.acceptChat(sessionId);

    if (!session) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Bad Request', message: 'Cannot accept this chat' }),
      });
    }

    const partner = chatState.getPartner(sessionId, user.id);

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ session, partner }),
    });
  });

  // DELETE /api/chat/:sessionId/reject - Reject chat request
  page.route(/\/api\/chat\/(\d+)\/reject$/, async (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/chat\/(\d+)\/reject$/);
    if (!match) return route.continue();

    const sessionId = parseInt(match[1], 10);
    await applyDelay(`/api/chat/${sessionId}/reject`);
    if (checkError(route, `/api/chat/${sessionId}/reject`)) return;

    const success = chatState.rejectChat(sessionId);

    if (!success) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Bad Request', message: 'Cannot reject this chat' }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // DELETE /api/chat/:sessionId/cancel - Cancel waiting for match
  page.route(/\/api\/chat\/(\d+)\/cancel$/, async (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/chat\/(\d+)\/cancel$/);
    if (!match) return route.continue();

    const sessionId = parseInt(match[1], 10);
    await applyDelay(`/api/chat/${sessionId}/cancel`);
    if (checkError(route, `/api/chat/${sessionId}/cancel`)) return;

    const success = chatState.cancelChat(sessionId);

    if (!success) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Bad Request', message: 'Cannot cancel this chat' }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // PUT /api/chat/:sessionId/end - End active chat
  page.route(/\/api\/chat\/(\d+)\/end$/, async (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/chat\/(\d+)\/end$/);
    if (!match) return route.continue();

    const sessionId = parseInt(match[1], 10);
    await applyDelay(`/api/chat/${sessionId}/end`);
    if (checkError(route, `/api/chat/${sessionId}/end`)) return;

    const success = chatState.endChat(sessionId);

    if (!success) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Bad Request', message: 'Cannot end this chat' }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // GET /api/chat/:sessionId/messages - Get chat messages
  page.route(/\/api\/chat\/(\d+)\/messages$/, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();

    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/chat\/(\d+)\/messages$/);
    if (!match) return route.continue();

    const sessionId = parseInt(match[1], 10);
    await applyDelay(`/api/chat/${sessionId}/messages`);
    if (checkError(route, `/api/chat/${sessionId}/messages`)) return;

    const messages = chatState.getMessages(sessionId);

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ messages }),
    });
  });

  // POST /api/chat/:sessionId/messages - Send chat message
  page.route(/\/api\/chat\/(\d+)\/messages$/, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();

    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/chat\/(\d+)\/messages$/);
    if (!match) return route.continue();

    const sessionId = parseInt(match[1], 10);
    await applyDelay(`/api/chat/${sessionId}/messages/send`);
    if (checkError(route, `/api/chat/${sessionId}/messages/send`)) return;

    const user = sessionState.getCurrentUser();
    if (!user) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }

    const session = chatState.getSession(sessionId);
    if (!session) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found', message: 'Chat session not found' }),
      });
    }

    if (session.status !== 'matched') {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Bad Request', message: 'Cannot send message to this chat' }),
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

    const message = chatState.addMessage(sessionId, user.id, user.username, content);

    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ message }),
    });
  });

  // PUT /api/chat/:sessionId/mark-read - Mark messages as read
  page.route(/\/api\/chat\/(\d+)\/mark-read$/, async (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/chat\/(\d+)\/mark-read$/);
    if (!match) return route.continue();

    const sessionId = parseInt(match[1], 10);
    await applyDelay(`/api/chat/${sessionId}/mark-read`);
    if (checkError(route, `/api/chat/${sessionId}/mark-read`)) return;

    const user = sessionState.getCurrentUser();
    if (!user) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }

    chatState.markRead(sessionId, user.id);

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}
