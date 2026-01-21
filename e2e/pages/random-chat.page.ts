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
  readonly partnerUsername: Locator;
  readonly rerollButton: Locator;
  readonly leaveChatButton: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messagesContainer: Locator;

  // Loading and error states
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly errorAlert: Locator;
  readonly connectionError: Locator;

  // Chat ended state
  readonly chatEndedText: Locator;
  readonly startNewChatButton: Locator;

  // Message elements
  readonly ownMessages: Locator;
  readonly partnerMessages: Locator;
  readonly systemMessages: Locator;

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
    this.partnerUsername = page.locator('[data-testid="partner-username"]').or(
      page.locator('.text-lg.font-semibold').filter({ hasNotText: 'Random Chat' })
    );
    this.rerollButton = page.getByRole('button', { name: 'Reroll' });
    this.leaveChatButton = page.getByRole('button', { name: 'Leave Chat' });
    this.messageInput = page.getByPlaceholder('Type a message...');
    this.sendButton = page.getByRole('button', { name: 'Send' });
    this.messagesContainer = page.locator('.min-h-\\[400px\\]');

    // Loading and error locators
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"], .animate-spin');
    this.errorMessage = page.locator('[data-testid="error-message"], .text-red-500, .text-red-600');
    this.errorAlert = page.locator('[role="alert"]');
    this.connectionError = page.getByText(/connection.*error|failed.*connect|socket.*error/i);

    // Chat ended state
    this.chatEndedText = page.getByText(/chat.*ended|partner.*left/i);
    this.startNewChatButton = page.getByRole('button', { name: /start.*new.*chat|chat.*again/i });

    // Message styling - own vs partner messages
    this.ownMessages = page.locator('[data-testid="own-message"]').or(
      page.locator('.bg-blue-500, .bg-blue-600').locator('p')
    );
    this.partnerMessages = page.locator('[data-testid="partner-message"]').or(
      page.locator('.bg-gray-200, .bg-gray-300').locator('p')
    );
    this.systemMessages = page.locator('[data-testid="system-message"]').or(
      page.locator('.text-gray-500.text-center, .italic')
    );
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

  async trySendMessage(content: string) {
    await this.messageInput.fill(content);
    await this.sendButton.click();
    // Don't wait - message might fail
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
    return this.messagesContainer.locator('p.text-gray-700, p.text-white').allTextContents();
  }

  async getOwnMessages(): Promise<string[]> {
    return this.ownMessages.allTextContents();
  }

  async getPartnerMessages(): Promise<string[]> {
    return this.partnerMessages.allTextContents();
  }

  async getPartnerName(): Promise<string> {
    const text = await this.chattingWithText.textContent();
    // Extract partner name from "Chatting with: Username"
    return text?.replace('Chatting with:', '').trim() || '';
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

  async isChatEnded(): Promise<boolean> {
    // Check if input is disabled with "Chat has ended" placeholder
    const placeholder = await this.messageInput.getAttribute('placeholder');
    return placeholder === 'Chat has ended' || await this.chatEndedText.isVisible();
  }

  async waitForChatEnded(timeout = 10000) {
    // Chat ended is indicated by disabled input or system message
    await this.page.getByPlaceholder('Chat has ended').waitFor({ state: 'visible', timeout });
  }

  async isMessageInputDisabled(): Promise<boolean> {
    return this.messageInput.isDisabled();
  }

  async isLoading(): Promise<boolean> {
    return this.loadingSpinner.isVisible();
  }

  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible() || this.errorAlert.isVisible() || this.connectionError.isVisible();
  }

  async getErrorText(): Promise<string> {
    if (await this.errorMessage.isVisible()) {
      return (await this.errorMessage.textContent()) || '';
    }
    if (await this.errorAlert.isVisible()) {
      return (await this.errorAlert.textContent()) || '';
    }
    if (await this.connectionError.isVisible()) {
      return (await this.connectionError.textContent()) || '';
    }
    return '';
  }

  async startNewChat() {
    if (await this.startNewChatButton.isVisible()) {
      await this.startNewChatButton.click();
    } else {
      await this.startChatButton.click();
    }
    await this.waitingText.waitFor({ state: 'visible', timeout: 10000 });
  }
}
