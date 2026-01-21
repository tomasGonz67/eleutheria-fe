// Forums API mock handlers

import { Page, Route } from '@playwright/test';
import { ForumsState } from '../data/forums.data';
import { SessionState } from '../data/session.data';
import { ErrorResponse } from '../data/errors.data';

export interface ForumsHandlerOptions {
  forumsState: ForumsState;
  sessionState: SessionState;
  errors?: Map<string, ErrorResponse>;
  delays?: Map<string, number>;
}

export function setupForumsHandlers(page: Page, options: ForumsHandlerOptions) {
  const { forumsState, sessionState, errors = new Map(), delays = new Map() } = options;

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

  // GET /api/forums - List forums (paginated)
  page.route(/\/api\/forums(\?|$)/, async (route) => {
    const url = new URL(route.request().url());
    const searchParams = url.searchParams;

    // Skip if this is a create, search, or specific forum endpoint
    if (url.pathname.includes('/create') || url.pathname.includes('/search') || /\/api\/forums\/\d+/.test(url.pathname)) {
      return route.continue();
    }

    await applyDelay('/api/forums');
    if (checkError(route, '/api/forums')) return;

    const page_num = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const result = forumsState.getPaginated(page_num, limit);

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(result),
    });
  });

  // GET /api/forums/search - Search forums
  page.route('**/api/forums/search*', async (route) => {
    await applyDelay('/api/forums/search');
    if (checkError(route, '/api/forums/search')) return;

    const url = new URL(route.request().url());
    const query = url.searchParams.get('q') || '';
    const page_num = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    const result = forumsState.search(query, page_num, limit);

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(result),
    });
  });

  // POST /api/forums/create - Create forum
  page.route('**/api/forums/create', async (route) => {
    await applyDelay('/api/forums/create');
    if (checkError(route, '/api/forums/create')) return;

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
          details: { name: 'Forum name is required' },
        }),
      });
    }

    if (name.length > 100) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation Error',
          details: { name: 'Forum name must be 100 characters or less' },
        }),
      });
    }

    if (description.length > 500) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation Error',
          details: { description: 'Description must be 500 characters or less' },
        }),
      });
    }

    const forum = forumsState.create(name, description, user.id, user.username);

    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ forum }),
    });
  });

  // GET /api/forums/:id - Get single forum
  page.route(/\/api\/forums\/(\d+)$/, async (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/forums\/(\d+)$/);
    if (!match) return route.continue();

    const forumId = parseInt(match[1], 10);
    await applyDelay(`/api/forums/${forumId}`);
    if (checkError(route, `/api/forums/${forumId}`)) return;

    const forum = forumsState.getById(forumId);

    if (!forum) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found', message: 'Forum not found' }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ forum }),
    });
  });

  // PUT /api/forums/:id - Update forum
  page.route(/\/api\/forums\/(\d+)$/, async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();

    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/forums\/(\d+)$/);
    if (!match) return route.continue();

    const forumId = parseInt(match[1], 10);
    await applyDelay(`/api/forums/${forumId}/edit`);
    if (checkError(route, `/api/forums/${forumId}/edit`)) return;

    const user = sessionState.getCurrentUser();
    if (!user) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }

    const forum = forumsState.getById(forumId);
    if (!forum) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found', message: 'Forum not found' }),
      });
    }

    // Check ownership
    if (forum.created_by !== user.id) {
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden', message: 'You can only edit your own forums' }),
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
    if (name !== undefined && name.length > 100) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation Error',
          details: { name: 'Forum name must be 100 characters or less' },
        }),
      });
    }

    const updated = forumsState.update(forumId, { name, description });

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ forum: updated }),
    });
  });

  // DELETE /api/forums/:id - Delete forum
  page.route(/\/api\/forums\/(\d+)$/, async (route) => {
    if (route.request().method() !== 'DELETE') return route.continue();

    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/forums\/(\d+)$/);
    if (!match) return route.continue();

    const forumId = parseInt(match[1], 10);
    await applyDelay(`/api/forums/${forumId}/delete`);
    if (checkError(route, `/api/forums/${forumId}/delete`)) return;

    const user = sessionState.getCurrentUser();
    if (!user) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }

    const forum = forumsState.getById(forumId);
    if (!forum) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found', message: 'Forum not found' }),
      });
    }

    // Check ownership
    if (forum.created_by !== user.id) {
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden', message: 'You can only delete your own forums' }),
      });
    }

    forumsState.delete(forumId);

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}
