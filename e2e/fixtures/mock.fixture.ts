// Central mock fixture for E2E tests
// Provides a unified API for setting up mocks across all features

import { test as base, Page, BrowserContext, Browser } from '@playwright/test';
import { SessionState, MockUser, createMockUser } from '../mocks/data/session.data';
import { ForumsState, MockForum } from '../mocks/data/forums.data';
import { PostsState, MockPost } from '../mocks/data/posts.data';
import { ChatroomsState, MockChatroom } from '../mocks/data/chatrooms.data';
import { ChatState, MockChatSession } from '../mocks/data/chat.data';
import { ErrorResponse } from '../mocks/data/errors.data';
import { setupSessionHandlers } from '../mocks/handlers/session.handlers';
import { setupForumsHandlers } from '../mocks/handlers/forums.handlers';
import { setupPostsHandlers } from '../mocks/handlers/posts.handlers';
import { setupChatroomsHandlers } from '../mocks/handlers/chatrooms.handlers';
import { setupChatHandlers } from '../mocks/handlers/chat.handlers';
import { setupSocketMock, SocketMockController } from '../mocks/socket/socket-mock';

export interface MockContext {
  // State managers
  sessionState: SessionState;
  forumsState: ForumsState;
  postsState: PostsState;
  chatroomsState: ChatroomsState;
  chatState: ChatState;

  // Socket controller
  socket: SocketMockController;

  // Error and delay configuration
  errors: Map<string, ErrorResponse>;
  delays: Map<string, number>;

  // Convenience methods for setting data
  setUser: (user: Partial<MockUser>) => MockUser;
  setForums: (forums: MockForum[]) => void;
  setPosts: (posts: MockPost[]) => void;
  setChatrooms: (chatrooms: MockChatroom[]) => void;

  // Error injection
  setError: (endpoint: string, error: ErrorResponse) => void;
  clearError: (endpoint: string) => void;
  clearAllErrors: () => void;

  // Delay injection for loading state tests
  setDelay: (endpoint: string, delayMs: number) => void;
  clearDelay: (endpoint: string) => void;
  clearAllDelays: () => void;

  // Reset all state
  reset: () => void;
}

export interface TestUser {
  page: Page;
  context: BrowserContext;
  username: string;
  sessionToken: string;
  mocks: MockContext;
}

async function setupMocks(page: Page): Promise<MockContext> {
  // Initialize state managers
  const sessionState = new SessionState();
  const forumsState = new ForumsState();
  const postsState = new PostsState();
  const chatroomsState = new ChatroomsState();
  const chatState = new ChatState();

  // Error and delay maps
  const errors = new Map<string, ErrorResponse>();
  const delays = new Map<string, number>();

  // Setup socket mock
  const socket = await setupSocketMock(page);

  // Setup all API handlers
  setupSessionHandlers(page, { sessionState, errors, delays });
  setupForumsHandlers(page, { forumsState, sessionState, errors, delays });
  setupPostsHandlers(page, { postsState, sessionState, errors, delays });
  setupChatroomsHandlers(page, { chatroomsState, sessionState, errors, delays });
  setupChatHandlers(page, { chatState, sessionState, errors, delays });

  const mockContext: MockContext = {
    sessionState,
    forumsState,
    postsState,
    chatroomsState,
    chatState,
    socket,
    errors,
    delays,

    setUser: (overrides: Partial<MockUser>) => {
      const user = createMockUser(overrides);
      sessionState.setCurrentUser(user);
      return user;
    },

    setForums: (forums: MockForum[]) => {
      forumsState.setForums(forums);
    },

    setPosts: (posts: MockPost[]) => {
      postsState.setPosts(posts);
    },

    setChatrooms: (chatrooms: MockChatroom[]) => {
      chatroomsState.setChatrooms(chatrooms);
    },

    setError: (endpoint: string, error: ErrorResponse) => {
      errors.set(endpoint, error);
    },

    clearError: (endpoint: string) => {
      errors.delete(endpoint);
    },

    clearAllErrors: () => {
      errors.clear();
    },

    setDelay: (endpoint: string, delayMs: number) => {
      delays.set(endpoint, delayMs);
    },

    clearDelay: (endpoint: string) => {
      delays.delete(endpoint);
    },

    clearAllDelays: () => {
      delays.clear();
    },

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

  return mockContext;
}

async function createAuthenticatedUser(
  browser: Browser,
  username?: string,
  existingMocks?: MockContext
): Promise<TestUser> {
  const context = await browser.newContext();
  const page = await context.newPage();

  // Setup mocks for this page
  const mocks = await setupMocks(page);

  // If we want to share state with another user (for multi-user tests)
  if (existingMocks) {
    // Share the state objects but keep separate error/delay configs
    Object.assign(mocks.forumsState, existingMocks.forumsState);
    Object.assign(mocks.postsState, existingMocks.postsState);
    Object.assign(mocks.chatroomsState, existingMocks.chatroomsState);
    Object.assign(mocks.chatState, existingMocks.chatState);
  }

  // Create a user with the mock
  const user = mocks.setUser({ username });

  // Set the session cookie
  await context.addCookies([
    {
      name: 'session_token',
      value: user.session_token,
      domain: 'localhost',
      path: '/',
    },
  ]);

  return {
    page,
    context,
    username: user.username,
    sessionToken: user.session_token,
    mocks,
  };
}

// Extended test fixture with mock support
export const test = base.extend<{
  // Get mocks for the default page
  setupMocks: (page: Page) => Promise<MockContext>;

  // Pre-authenticated page with mocks
  authenticatedPage: Page;
  mocks: MockContext;

  // Factory to create multiple users (for multi-user tests)
  createUser: (username?: string) => Promise<TestUser>;
}>({
  setupMocks: async ({}, use) => {
    await use(setupMocks);
  },

  mocks: async ({ page }, use) => {
    const mocks = await setupMocks(page);
    await use(mocks);
  },

  authenticatedPage: async ({ browser }, use) => {
    const { page, context, mocks } = await createAuthenticatedUser(browser);

    // Navigate to landing and create session via the app flow
    await page.goto('/');
    await page.click('button:has-text("Browse Forums")');
    await page.waitForURL(/\/forums/);

    await use(page);
    await context.close();
  },

  createUser: async ({ browser }, use) => {
    const users: TestUser[] = [];
    let sharedMocks: MockContext | undefined;

    await use(async (username?: string) => {
      const user = await createAuthenticatedUser(browser, username, sharedMocks);

      // Share state between users for multi-user scenarios
      if (!sharedMocks) {
        sharedMocks = user.mocks;
      }

      users.push(user);
      return user;
    });

    // Cleanup
    for (const user of users) {
      await user.context.close();
    }
  },
});

export { expect } from '@playwright/test';

// Re-export types and utilities
export type { MockUser } from '../mocks/data/session.data';
export type { MockForum } from '../mocks/data/forums.data';
export type { MockPost } from '../mocks/data/posts.data';
export type { MockChatroom } from '../mocks/data/chatrooms.data';
export type { MockChatSession } from '../mocks/data/chat.data';
export type { ErrorResponse } from '../mocks/data/errors.data';
export { errors, sessionErrors, forumErrors, postErrors, chatroomErrors, chatErrors } from '../mocks/data/errors.data';
