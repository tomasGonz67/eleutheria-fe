import { Page, Locator } from '@playwright/test';

export class LandingPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly viewGlobalFeedButton: Locator;
  readonly browseForumsButton: Locator;
  readonly randomChatButton: Locator;
  readonly browseChatroomsButton: Locator;

  // Loading and error states
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('input[placeholder="Enter username (optional)"]');
    this.viewGlobalFeedButton = page.getByRole('button', { name: 'View Global Feed' });
    this.browseForumsButton = page.getByRole('button', { name: 'Browse Forums' });
    this.randomChatButton = page.getByRole('button', { name: 'Random Chat' });
    this.browseChatroomsButton = page.getByRole('button', { name: 'Browse Chatrooms' });

    // Loading and error locators
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"], .animate-spin');
    this.errorMessage = page.locator('[data-testid="error-message"], .text-red-500, .text-red-600');
    this.errorAlert = page.locator('[role="alert"]');
  }

  async goto() {
    await this.page.goto('/');
  }

  async setUsername(username: string) {
    await this.usernameInput.fill(username);
  }

  async clearUsername() {
    await this.usernameInput.clear();
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

  async isLoading(): Promise<boolean> {
    return this.loadingSpinner.isVisible();
  }

  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible() || this.errorAlert.isVisible();
  }

  async getErrorText(): Promise<string> {
    if (await this.errorMessage.isVisible()) {
      return this.errorMessage.textContent() || '';
    }
    if (await this.errorAlert.isVisible()) {
      return this.errorAlert.textContent() || '';
    }
    return '';
  }
}
