import { Page, Locator } from '@playwright/test';

export class RandomChatPage {
  readonly page: Page;
  readonly heading: Locator;

  // Idle state
  readonly startChatButton: Locator;

  // Waiting state
  readonly waitingText: Locator;
  readonly cancelSearchButton: Locator;

  // Matched state
  readonly chattingWithText: Locator;
  readonly rerollButton: Locator;
  readonly leaveChatButton: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messagesContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Random Chat' });

    // Idle
    this.startChatButton = page.getByRole('button', { name: 'Start Random Chat' });

    // Waiting
    this.waitingText = page.getByText('Looking for a chat partner...');
    this.cancelSearchButton = page.getByRole('button', { name: 'Cancel Search' });

    // Matched
    this.chattingWithText = page.getByText('Chatting with:');
    this.rerollButton = page.getByRole('button', { name: 'Reroll' });
    this.leaveChatButton = page.getByRole('button', { name: 'Leave Chat' });
    this.messageInput = page.getByPlaceholder('Type a message...');
    this.sendButton = page.getByRole('button', { name: 'Send' });
    this.messagesContainer = page.locator('.min-h-\\[400px\\]');
  }

  async goto() {
    await this.page.goto('/chat/random');
  }

  async startSearch() {
    await this.startChatButton.click();
    await this.waitingText.waitFor({ state: 'visible', timeout: 10000 });
  }

  async cancelSearch() {
    await this.cancelSearchButton.click();
    await this.startChatButton.waitFor({ state: 'visible', timeout: 10000 });
  }

  async waitForMatch(timeout = 30000) {
    await this.chattingWithText.waitFor({ state: 'visible', timeout });
  }

  async sendMessage(content: string) {
    await this.messageInput.fill(content);
    await this.sendButton.click();
    // Wait for message to appear
    await this.page.getByText(content).waitFor({ state: 'visible', timeout: 5000 });
  }

  async waitForMessage(content: string, timeout = 10000) {
    await this.page.getByText(content).waitFor({ state: 'visible', timeout });
  }

  async leaveChat() {
    await this.leaveChatButton.click();
    await this.startChatButton.waitFor({ state: 'visible', timeout: 10000 });
  }

  async reroll() {
    await this.rerollButton.click();
    await this.waitingText.waitFor({ state: 'visible', timeout: 10000 });
  }

  async getMessages(): Promise<string[]> {
    return this.messagesContainer.locator('p.text-gray-700').allTextContents();
  }

  async isIdle(): Promise<boolean> {
    return this.startChatButton.isVisible();
  }

  async isWaiting(): Promise<boolean> {
    return this.waitingText.isVisible();
  }

  async isMatched(): Promise<boolean> {
    return this.chattingWithText.isVisible();
  }

  async waitForChatEnded(timeout = 10000) {
    // Chat ended is indicated by disabled input or system message
    await this.page.getByPlaceholder('Chat has ended').waitFor({ state: 'visible', timeout });
  }
}
