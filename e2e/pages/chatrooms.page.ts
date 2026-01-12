import { Page, Locator } from '@playwright/test';

export class ChatroomsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createChatroomButton: Locator;
  readonly searchInput: Locator;
  readonly chatroomsList: Locator;

  // Create Chatroom Modal
  readonly modalTitle: Locator;
  readonly chatroomNameInput: Locator;
  readonly chatroomDescriptionInput: Locator;
  readonly modalCancelButton: Locator;
  readonly modalSubmitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Chatrooms' });
    this.createChatroomButton = page.getByRole('button', { name: 'Create Chatroom' });
    this.searchInput = page.getByPlaceholder('Search chatrooms...');
    this.chatroomsList = page.locator('.space-y-4');

    // Modal elements
    this.modalTitle = page.getByRole('heading', { name: 'Create Chatroom' });
    this.chatroomNameInput = page.getByPlaceholder('e.g., General Chat');
    this.chatroomDescriptionInput = page.getByPlaceholder('e.g., A place for general discussion');
    this.modalCancelButton = page.locator('form button:has-text("Cancel")');
    this.modalSubmitButton = page.locator('form button[type="submit"]');
  }

  async goto() {
    await this.page.goto('/chatrooms');
  }

  async openCreateModal() {
    await this.createChatroomButton.click();
    await this.modalTitle.waitFor({ state: 'visible' });
  }

  async createChatroom(name: string, description: string) {
    await this.openCreateModal();
    await this.chatroomNameInput.fill(name);
    await this.chatroomDescriptionInput.fill(description);
    await this.modalSubmitButton.click();
    await this.modalTitle.waitFor({ state: 'hidden' });
  }

  async searchChatrooms(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForURL(/q=/);
  }

  async getChatroomNames(): Promise<string[]> {
    return this.page.locator('h2.text-xl.font-semibold').allTextContents();
  }

  async clickChatroom(name: string) {
    await this.page.locator(`h2:has-text("${name}")`).click();
    await this.page.waitForURL(/\/chatrooms\/\d+/);
  }

  async editChatroom(chatroomName: string, newName: string, newDescription: string) {
    const chatroomCard = this.page.locator(`div:has(h2:has-text("${chatroomName}"))`).first();
    await chatroomCard.getByRole('button', { name: 'Edit' }).click();

    await this.page.getByRole('heading', { name: 'Edit Chatroom' }).waitFor({ state: 'visible' });
    await this.chatroomNameInput.fill(newName);
    await this.chatroomDescriptionInput.fill(newDescription);
    await this.modalSubmitButton.click();
    await this.page.getByRole('heading', { name: 'Edit Chatroom' }).waitFor({ state: 'hidden' });
  }

  async deleteChatroom(chatroomName: string) {
    const chatroomCard = this.page.locator(`div:has(h2:has-text("${chatroomName}"))`).first();

    this.page.once('dialog', dialog => dialog.accept());
    await chatroomCard.getByRole('button', { name: 'Delete' }).click();
  }

  async chatroomExists(name: string): Promise<boolean> {
    const count = await this.page.locator(`h2:has-text("${name}")`).count();
    return count > 0;
  }
}
