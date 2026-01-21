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

  // Loading and error states
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly errorAlert: Locator;
  readonly emptyState: Locator;
  readonly noResultsText: Locator;

  // Pagination
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly pageInfo: Locator;

  // Validation errors in modal
  readonly nameError: Locator;
  readonly descriptionError: Locator;

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

    // Loading and error locators
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"], .animate-spin');
    this.errorMessage = page.locator('[data-testid="error-message"], .text-red-500, .text-red-600');
    this.errorAlert = page.locator('[role="alert"]');
    this.emptyState = page.locator('[data-testid="empty-state"]').or(page.getByText('No chatrooms found'));
    this.noResultsText = page.getByText('No chatrooms match your search');

    // Pagination
    this.previousPageButton = page.getByRole('button', { name: /previous/i });
    this.nextPageButton = page.getByRole('button', { name: /next/i });
    this.pageInfo = page.locator('[data-testid="page-info"]');

    // Validation errors
    this.nameError = page.locator('[data-testid="name-error"]').or(page.locator('form').getByText(/name.*required|name.*must be/i));
    this.descriptionError = page.locator('[data-testid="description-error"]').or(page.locator('form').getByText(/description.*required|description.*must be/i));
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

  async tryCreateChatroom(name: string, description: string) {
    await this.openCreateModal();
    await this.chatroomNameInput.fill(name);
    await this.chatroomDescriptionInput.fill(description);
    await this.modalSubmitButton.click();
    // Don't wait for modal to close - it might stay open due to validation error
  }

  async searchChatrooms(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForURL(/q=/);
  }

  async clearSearch() {
    await this.searchInput.clear();
    await this.searchInput.press('Enter');
  }

  async getChatroomNames(): Promise<string[]> {
    return this.page.locator('h2.text-xl.font-semibold').allTextContents();
  }

  async getChatroomCount(): Promise<number> {
    return this.page.locator('h2.text-xl.font-semibold').count();
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

  async cancelDeleteChatroom(chatroomName: string) {
    const chatroomCard = this.page.locator(`div:has(h2:has-text("${chatroomName}"))`).first();

    this.page.once('dialog', dialog => dialog.dismiss());
    await chatroomCard.getByRole('button', { name: 'Delete' }).click();
  }

  async chatroomExists(name: string): Promise<boolean> {
    const count = await this.page.locator(`h2:has-text("${name}")`).count();
    return count > 0;
  }

  async isEditButtonVisible(chatroomName: string): Promise<boolean> {
    const chatroomCard = this.page.locator(`div:has(h2:has-text("${chatroomName}"))`).first();
    return chatroomCard.getByRole('button', { name: 'Edit' }).isVisible();
  }

  async isDeleteButtonVisible(chatroomName: string): Promise<boolean> {
    const chatroomCard = this.page.locator(`div:has(h2:has-text("${chatroomName}"))`).first();
    return chatroomCard.getByRole('button', { name: 'Delete' }).isVisible();
  }

  async isLoading(): Promise<boolean> {
    return this.loadingSpinner.isVisible();
  }

  async waitForLoading() {
    await this.loadingSpinner.waitFor({ state: 'visible' });
  }

  async waitForLoadingComplete() {
    await this.loadingSpinner.waitFor({ state: 'hidden' });
  }

  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible() || this.errorAlert.isVisible();
  }

  async getErrorText(): Promise<string> {
    if (await this.errorMessage.isVisible()) {
      return (await this.errorMessage.textContent()) || '';
    }
    if (await this.errorAlert.isVisible()) {
      return (await this.errorAlert.textContent()) || '';
    }
    return '';
  }

  async isEmpty(): Promise<boolean> {
    return this.emptyState.isVisible();
  }

  async hasNoSearchResults(): Promise<boolean> {
    return this.noResultsText.isVisible();
  }

  async goToNextPage() {
    await this.nextPageButton.click();
  }

  async goToPreviousPage() {
    await this.previousPageButton.click();
  }

  async closeModal() {
    await this.modalCancelButton.click();
    await this.modalTitle.waitFor({ state: 'hidden' });
  }
}
