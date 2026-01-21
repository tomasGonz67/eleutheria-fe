// Authentication fixture for E2E tests
// Updated to work with mocked APIs

import { test as base, Page, BrowserContext, Browser } from '@playwright/test';
import { SessionState, createMockUser, MockUser } from '../mocks/data/session.data';
import { ForumsState } from '../mocks/data/forums.data';
import { PostsState } from '../mocks/data/posts.data';
import { ChatroomsState } from '../mocks/data/chatrooms.data';
import { ChatState } from '../mocks/data/chat.data';
import { ErrorResponse } from '../mocks/data/errors.data';
import { setupSessionHandlers } from '../mocks/handlers/session.handlers';
import { setupForumsHandlers } from '../mocks/handlers/forums.handlers';
import { setupPostsHandlers } from '../mocks/handlers/posts.handlers';
import { setupChatroomsHandlers } from '../mocks/handlers/chatrooms.handlers';
import { setupChatHandlers } from '../mocks/handlers/chat.handlers';
import { setupSocketMock, SocketMockController } from '../mocks/socket/socket-mock';

export interface MockContext {
  sessionState: SessionState;
  forumsState: ForumsState;
  postsState: PostsState;
  chatroomsState: ChatroomsState;
  chatState: ChatState;
  socket: SocketMockController;
  errors: Map<string, ErrorResponse>;
  delays: Map<string, number>;
  setError: (endpoint: string, error: ErrorResponse) => void;
  setDelay: (endpoint: string, delayMs: number) => void;
  clearErrors: () => void;
  clearDelays: () => void;
  reset: () => void;
}

export interface TestUser {
  page: Page;
  context: BrowserContext;
  username: string;
  sessionToken: string;
  mocks: MockContext;
}

async function setupMocksForPage(page: Page): Promise<MockContext> {
  const sessionState = new SessionState();
  const forumsState = new ForumsState();
  const postsState = new PostsState();
  const chatroomsState = new ChatroomsState();
  const chatState = new ChatState();
  const errors = new Map<string, ErrorResponse>();
  const delays = new Map<string, number>();

  const socket = await setupSocketMock(page);

  setupSessionHandlers(page, { sessionState, errors, delays });
  setupForumsHandlers(page, { forumsState, sessionState, errors, delays });
  setupPostsHandlers(page, { postsState, sessionState, errors, delays });
  setupChatroomsHandlers(page, { chatroomsState, sessionState, errors, delays });
  setupChatHandlers(page, { chatState, sessionState, errors, delays });

  return {
    sessionState,
    forumsState,
    postsState,
    chatroomsState,
    chatState,
    socket,
    errors,
    delays,
    setError: (endpoint: string, error: ErrorResponse) => errors.set(endpoint, error),
    setDelay: (endpoint: string, delayMs: number) => delays.set(endpoint, delayMs),
    clearErrors: () => errors.clear(),
    clearDelays: () => delays.clear(),
    reset: () => {
      sessionState.reset();
      forumsState.reset();
      postsState.reset();
      chatroomsState.reset();
      chatState.reset();
      errors.clear();
      delays.clear();
    },
  };
}

export async function createAuthenticatedUser(
  browser: Browser,
  username?: string
): Promise<TestUser> {
  const context = await browser.newContext();
  const page = await context.newPage();

  // Setup mocks before navigating
  const mocks = await setupMocksForPage(page);

  // Navigate to landing page
  await page.goto('/');

  // Set username if provided
  if (username) {
    await page.fill('input[placeholder="Enter username (optional)"]', username);
  }

  // Click to create session and navigate
  await page.click('button:has-text("Browse Forums")');
  await page.waitForURL(/\/forums/);

  // Get the session info from mocks
  const user = mocks.sessionState.getCurrentUser();

  return {
    page,
    context,
    username: user?.username || username || 'Anonymous',
    sessionToken: user?.session_token || '',
    mocks,
  };
}

export const test = base.extend<{
  authenticatedPage: Page;
  mocks: MockContext;
  createUser: (username?: string) => Promise<TestUser>;
}>({
  mocks: async ({ page }, use) => {
    const mocks = await setupMocksForPage(page);
    await use(mocks);
  },

  authenticatedPage: async ({ browser }, use) => {
    const { page, context } = await createAuthenticatedUser(browser);
    await use(page);
    await context.close();
  },

  createUser: async ({ browser }, use) => {
    const users: TestUser[] = [];

    await use(async (username?: string) => {
      const user = await createAuthenticatedUser(browser, username);
      users.push(user);
      return user;
    });

    for (const user of users) {
      await user.context.close();
    }
  },
});

export { expect } from '@playwright/test';
