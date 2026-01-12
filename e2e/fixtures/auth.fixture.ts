import { test as base, Page, BrowserContext, Browser } from '@playwright/test';

export interface TestUser {
  page: Page;
  context: BrowserContext;
  username: string;
  sessionToken: string;
}

export async function createAuthenticatedUser(
  browser: Browser,
  username?: string
): Promise<TestUser> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('/');

  if (username) {
    await page.fill('input[placeholder="Enter username (optional)"]', username);
  }

  await page.click('button:has-text("Browse Forums")');
  await page.waitForURL(/\/forums/);

  const cookies = await context.cookies();
  const sessionCookie = cookies.find((c) => c.name === 'session_token');

  return {
    page,
    context,
    username: username || 'Anonymous',
    sessionToken: sessionCookie?.value || '',
  };
}

export const test = base.extend<{
  authenticatedPage: Page;
  createUser: (username?: string) => Promise<TestUser>;
}>({
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
