// Session API mock handlers

import { Page, Route } from '@playwright/test';
import { SessionState, generateGreekUsername } from '../data/session.data';
import { ErrorResponse } from '../data/errors.data';

export interface SessionHandlerOptions {
  sessionState: SessionState;
  errors?: Map<string, ErrorResponse>;
  delays?: Map<string, number>;
}

export function setupSessionHandlers(page: Page, options: SessionHandlerOptions) {
  const { sessionState, errors = new Map(), delays = new Map() } = options;

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

  // POST /api/session/create - Create new session
  page.route('**/api/session/create', async (route) => {
    await applyDelay('/api/session/create');
    if (checkError(route, '/api/session/create')) return;

    const request = route.request();
    let username: string | undefined;

    try {
      const body = await request.postDataJSON();
      username = body?.username;
    } catch {
      // No body or invalid JSON, use random username
    }

    // Validate username if provided
    if (username) {
      username = username.trim();
      if (username.length > 20) {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Validation Error',
            details: { username: 'Username must be 20 characters or less' },
          }),
        });
      }
      if (username.length === 0) {
        username = undefined;
      }
    }

    // Generate Greek username if none provided
    const finalUsername = username || generateGreekUsername();
    const user = sessionState.createSession(finalUsername);

    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ user }),
      headers: {
        'Set-Cookie': `session_token=${user.session_token}; Path=/; HttpOnly`,
      },
    });
  });

  // GET /api/session/me - Get current session
  page.route('**/api/session/me', async (route) => {
    await applyDelay('/api/session/me');
    if (checkError(route, '/api/session/me')) return;

    const user = sessionState.getCurrentUser();

    if (!user) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized', message: 'No session found' }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user }),
    });
  });

  // PUT /api/session/username - Update username
  page.route('**/api/session/username', async (route) => {
    await applyDelay('/api/session/username');
    if (checkError(route, '/api/session/username')) return;

    const request = route.request();
    let newUsername: string;

    try {
      const body = await request.postDataJSON();
      newUsername = body?.username?.trim();
    } catch {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Bad Request', message: 'Invalid request body' }),
      });
    }

    if (!newUsername || newUsername.length === 0) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation Error',
          details: { username: 'Username is required' },
        }),
      });
    }

    if (newUsername.length > 20) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation Error',
          details: { username: 'Username must be 20 characters or less' },
        }),
      });
    }

    const user = sessionState.updateUsername(newUsername);

    if (!user) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized', message: 'No session found' }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user }),
    });
  });
}
