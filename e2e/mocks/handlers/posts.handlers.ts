// Posts API mock handlers

import { Page, Route } from '@playwright/test';
import { PostsState } from '../data/posts.data';
import { SessionState } from '../data/session.data';
import { ErrorResponse } from '../data/errors.data';

export interface PostsHandlerOptions {
  postsState: PostsState;
  sessionState: SessionState;
  errors?: Map<string, ErrorResponse>;
  delays?: Map<string, number>;
}

export function setupPostsHandlers(page: Page, options: PostsHandlerOptions) {
  const { postsState, sessionState, errors = new Map(), delays = new Map() } = options;

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

  // GET /api/forums/:forumId/posts - List posts (paginated)
  // Also handles parent_id query param for replies
  page.route(/\/api\/forums\/(\d+)\/posts(\?|$)/, async (route) => {
    const url = new URL(route.request().url());

    // Skip if this is a search or specific post endpoint
    if (url.pathname.includes('/search') || /\/posts\/\d+/.test(url.pathname)) {
      return route.continue();
    }

    // Skip non-GET requests
    if (route.request().method() !== 'GET') {
      return route.continue();
    }

    const match = url.pathname.match(/\/api\/forums\/(\d+)\/posts/);
    if (!match) return route.continue();

    const forumId = parseInt(match[1], 10);
    const searchParams = url.searchParams;

    await applyDelay(`/api/forums/${forumId}/posts`);
    if (checkError(route, `/api/forums/${forumId}/posts`)) return;

    const page_num = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const parentId = searchParams.get('parent_id');

    let result;
    if (parentId) {
      // Get replies to a specific post
      result = postsState.getReplies(forumId, parseInt(parentId, 10));
    } else {
      // Get top-level posts
      result = postsState.getByForum(forumId, page_num, limit);
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(result),
    });
  });

  // GET /api/forums/:forumId/posts/search - Search posts
  page.route(/\/api\/forums\/(\d+)\/posts\/search/, async (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/forums\/(\d+)\/posts\/search/);
    if (!match) return route.continue();

    const forumId = parseInt(match[1], 10);
    await applyDelay(`/api/forums/${forumId}/posts/search`);
    if (checkError(route, `/api/forums/${forumId}/posts/search`)) return;

    const query = url.searchParams.get('q') || '';
    const page_num = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    const result = postsState.search(forumId, query, page_num, limit);

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(result),
    });
  });

  // POST /api/forums/:forumId/posts - Create post
  page.route(/\/api\/forums\/(\d+)\/posts$/, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();

    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/forums\/(\d+)\/posts$/);
    if (!match) return route.continue();

    const forumId = parseInt(match[1], 10);
    await applyDelay(`/api/forums/${forumId}/posts/create`);
    if (checkError(route, `/api/forums/${forumId}/posts/create`)) return;

    const user = sessionState.getCurrentUser();
    if (!user) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }

    let content: string;
    let parentId: number | undefined;

    try {
      const body = await route.request().postDataJSON();
      content = body?.content?.trim();
      parentId = body?.parent_id ? parseInt(body.parent_id, 10) : undefined;
    } catch {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Bad Request', message: 'Invalid request body' }),
      });
    }

    // Validation
    if (!content || content.length === 0) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation Error',
          details: { content: 'Post content is required' },
        }),
      });
    }

    if (content.length > 10000) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation Error',
          details: { content: 'Post content must be 10000 characters or less' },
        }),
      });
    }

    // If parentId provided, verify the parent exists
    if (parentId) {
      const parent = postsState.getById(parentId);
      if (!parent) {
        return route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not Found', message: 'Parent post not found' }),
        });
      }
    }

    const post = postsState.create(forumId, content, user.id, user.username, parentId);

    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ post }),
    });
  });

  // GET /api/forums/:forumId/posts/:postId - Get single post
  page.route(/\/api\/forums\/(\d+)\/posts\/(\d+)$/, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();

    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/forums\/(\d+)\/posts\/(\d+)$/);
    if (!match) return route.continue();

    const postId = parseInt(match[2], 10);
    await applyDelay(`/api/posts/${postId}`);
    if (checkError(route, `/api/posts/${postId}`)) return;

    const post = postsState.getById(postId);

    if (!post) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found', message: 'Post not found' }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ post }),
    });
  });

  // PUT /api/forums/:forumId/posts/:postId - Update post
  page.route(/\/api\/forums\/(\d+)\/posts\/(\d+)$/, async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();

    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/forums\/(\d+)\/posts\/(\d+)$/);
    if (!match) return route.continue();

    const postId = parseInt(match[2], 10);
    await applyDelay(`/api/posts/${postId}/edit`);
    if (checkError(route, `/api/posts/${postId}/edit`)) return;

    const user = sessionState.getCurrentUser();
    if (!user) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }

    const post = postsState.getById(postId);
    if (!post) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found', message: 'Post not found' }),
      });
    }

    // Check ownership
    if (post.created_by !== user.id) {
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden', message: 'You can only edit your own posts' }),
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

    // Validation
    if (!content || content.length === 0) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation Error',
          details: { content: 'Post content is required' },
        }),
      });
    }

    if (content.length > 10000) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation Error',
          details: { content: 'Post content must be 10000 characters or less' },
        }),
      });
    }

    const updated = postsState.update(postId, content);

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ post: updated }),
    });
  });

  // DELETE /api/forums/:forumId/posts/:postId - Delete post
  page.route(/\/api\/forums\/(\d+)\/posts\/(\d+)$/, async (route) => {
    if (route.request().method() !== 'DELETE') return route.continue();

    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/forums\/(\d+)\/posts\/(\d+)$/);
    if (!match) return route.continue();

    const postId = parseInt(match[2], 10);
    await applyDelay(`/api/posts/${postId}/delete`);
    if (checkError(route, `/api/posts/${postId}/delete`)) return;

    const user = sessionState.getCurrentUser();
    if (!user) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }

    const post = postsState.getById(postId);
    if (!post) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found', message: 'Post not found' }),
      });
    }

    // Check ownership
    if (post.created_by !== user.id) {
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden', message: 'You can only delete your own posts' }),
      });
    }

    postsState.delete(postId);

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}
