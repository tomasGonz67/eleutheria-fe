import { Page, Locator, expect } from '@playwright/test';

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

  async searchForums(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForURL(/q=/);
  }

  async getForumNames(): Promise<string[]> {
    const forums = await this.page.locator('h2.text-xl.font-semibold').allTextContents();
    return forums;
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

  async forumExists(name: string): Promise<boolean> {
    const count = await this.page.locator(`h2:has-text("${name}")`).count();
    return count > 0;
  }
}
