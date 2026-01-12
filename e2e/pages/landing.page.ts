import { Page, Locator } from '@playwright/test';

export class LandingPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly viewGlobalFeedButton: Locator;
  readonly browseForumsButton: Locator;
  readonly randomChatButton: Locator;
  readonly browseChatroomsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('input[placeholder="Enter username (optional)"]');
    this.viewGlobalFeedButton = page.getByRole('button', { name: 'View Global Feed' });
    this.browseForumsButton = page.getByRole('button', { name: 'Browse Forums' });
    this.randomChatButton = page.getByRole('button', { name: 'Random Chat' });
    this.browseChatroomsButton = page.getByRole('button', { name: 'Browse Chatrooms' });
  }

  async goto() {
    await this.page.goto('/');
  }

  async setUsername(username: string) {
    await this.usernameInput.fill(username);
  }

  async navigateToFeed() {
    await this.viewGlobalFeedButton.click();
    await this.page.waitForURL(/\/feed/);
  }

  async navigateToForums() {
    await this.browseForumsButton.click();
    await this.page.waitForURL(/\/forums/);
  }

  async navigateToRandomChat() {
    await this.randomChatButton.click();
    await this.page.waitForURL(/\/chat\/random/);
  }

  async navigateToChatrooms() {
    await this.browseChatroomsButton.click();
    await this.page.waitForURL(/\/chatrooms/);
  }
}
