import { Page, Locator } from '@playwright/test';

export class ForumsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createForumButton: Locator;
  readonly searchInput: Locator;
  readonly forumsList: Locator;

  // Create Forum Modal
  readonly modalTitle: Locator;
  readonly forumNameInput: Locator;
  readonly forumDescriptionInput: Locator;
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
    this.heading = page.getByRole('heading', { name: 'Forums' });
    this.createForumButton = page.getByRole('button', { name: 'Create Forum' });
    this.searchInput = page.getByPlaceholder('Search forums...');
    this.forumsList = page.locator('.space-y-4');

    // Modal elements
    this.modalTitle = page.getByRole('heading', { name: 'Create Forum' });
    this.forumNameInput = page.getByPlaceholder('e.g., Technology Discussion');
    this.forumDescriptionInput = page.getByPlaceholder('e.g., Talk about tech, gadgets, and software');
    this.modalCancelButton = page.locator('form button:has-text("Cancel")');
    this.modalSubmitButton = page.locator('form button[type="submit"]');

    // Loading and error locators
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"], .animate-spin');
    this.errorMessage = page.locator('[data-testid="error-message"], .text-red-500, .text-red-600');
    this.errorAlert = page.locator('[role="alert"]');
    this.emptyState = page.locator('[data-testid="empty-state"]').or(page.getByText('No forums found'));
    this.noResultsText = page.getByText('No forums match your search');

    // Pagination
    this.previousPageButton = page.getByRole('button', { name: /previous/i });
    this.nextPageButton = page.getByRole('button', { name: /next/i });
    this.pageInfo = page.locator('[data-testid="page-info"]');

    // Validation errors
    this.nameError = page.locator('[data-testid="name-error"]').or(page.locator('form').getByText(/name.*required|name.*must be/i));
    this.descriptionError = page.locator('[data-testid="description-error"]').or(page.locator('form').getByText(/description.*required|description.*must be/i));
  }

  async goto() {
    await this.page.goto('/forums');
  }

  async openCreateModal() {
    await this.createForumButton.click();
    await this.modalTitle.waitFor({ state: 'visible' });
  }

  async createForum(name: string, description: string) {
    await this.openCreateModal();
    await this.forumNameInput.fill(name);
    await this.forumDescriptionInput.fill(description);
    await this.modalSubmitButton.click();
    await this.modalTitle.waitFor({ state: 'hidden' });
  }

  async tryCreateForum(name: string, description: string) {
    await this.openCreateModal();
    await this.forumNameInput.fill(name);
    await this.forumDescriptionInput.fill(description);
    await this.modalSubmitButton.click();
    // Don't wait for modal to close - it might stay open due to validation error
  }

  async searchForums(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForURL(/q=/);
  }

  async clearSearch() {
    await this.searchInput.clear();
    await this.searchInput.press('Enter');
  }

  async getForumNames(): Promise<string[]> {
    const forums = await this.page.locator('h2.text-xl.font-semibold').allTextContents();
    return forums;
  }

  async getForumCount(): Promise<number> {
    return this.page.locator('h2.text-xl.font-semibold').count();
  }

  async clickForum(name: string) {
    await this.page.locator(`h2:has-text("${name}")`).click();
    await this.page.waitForURL(/\/forums\/\d+/);
  }

  async editForum(forumName: string, newName: string, newDescription: string) {
    const forumCard = this.page.locator(`div:has(h2:has-text("${forumName}"))`).first();
    await forumCard.getByRole('button', { name: 'Edit' }).click();

    await this.page.getByRole('heading', { name: 'Edit Forum' }).waitFor({ state: 'visible' });
    await this.forumNameInput.fill(newName);
    await this.forumDescriptionInput.fill(newDescription);
    await this.modalSubmitButton.click();
    await this.page.getByRole('heading', { name: 'Edit Forum' }).waitFor({ state: 'hidden' });
  }

  async deleteForum(forumName: string) {
    const forumCard = this.page.locator(`div:has(h2:has-text("${forumName}"))`).first();

    this.page.once('dialog', dialog => dialog.accept());
    await forumCard.getByRole('button', { name: 'Delete' }).click();
  }

  async cancelDeleteForum(forumName: string) {
    const forumCard = this.page.locator(`div:has(h2:has-text("${forumName}"))`).first();

    this.page.once('dialog', dialog => dialog.dismiss());
    await forumCard.getByRole('button', { name: 'Delete' }).click();
  }

  async forumExists(name: string): Promise<boolean> {
    const count = await this.page.locator(`h2:has-text("${name}")`).count();
    return count > 0;
  }

  async isEditButtonVisible(forumName: string): Promise<boolean> {
    const forumCard = this.page.locator(`div:has(h2:has-text("${forumName}"))`).first();
    return forumCard.getByRole('button', { name: 'Edit' }).isVisible();
  }

  async isDeleteButtonVisible(forumName: string): Promise<boolean> {
    const forumCard = this.page.locator(`div:has(h2:has-text("${forumName}"))`).first();
    return forumCard.getByRole('button', { name: 'Delete' }).isVisible();
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
