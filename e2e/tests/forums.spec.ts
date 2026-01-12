import { test, expect } from '../fixtures/auth.fixture';
import { ForumsPage } from '../pages/forums.page';

test.describe('Forums', () => {
  test('should display forums list', async ({ authenticatedPage }) => {
    const forumsPage = new ForumsPage(authenticatedPage);
    await forumsPage.goto();

    await expect(forumsPage.heading).toBeVisible();
    await expect(forumsPage.createForumButton).toBeVisible();
    await expect(forumsPage.searchInput).toBeVisible();
  });

  test('should create a new forum', async ({ authenticatedPage }) => {
    const forumsPage = new ForumsPage(authenticatedPage);
    await forumsPage.goto();

    const forumName = `Test Forum ${Date.now()}`;
    const forumDescription = 'A test forum created by Playwright';

    await forumsPage.createForum(forumName, forumDescription);

    // Forum should appear in the list
    await expect(authenticatedPage.getByText(forumName)).toBeVisible();
  });

  test('should search forums', async ({ authenticatedPage }) => {
    const forumsPage = new ForumsPage(authenticatedPage);
    await forumsPage.goto();

    // First create a forum to search for
    const uniqueName = `Searchable ${Date.now()}`;
    await forumsPage.createForum(uniqueName, 'Forum for search test');

    // Search for it
    await forumsPage.searchForums(uniqueName);

    // Should find the forum
    await expect(authenticatedPage.getByText(uniqueName)).toBeVisible();
  });

  test('should edit own forum', async ({ authenticatedPage }) => {
    const forumsPage = new ForumsPage(authenticatedPage);
    await forumsPage.goto();

    // Create a forum first
    const originalName = `Editable ${Date.now()}`;
    await forumsPage.createForum(originalName, 'Original description');

    // Edit it
    const newName = `Edited ${Date.now()}`;
    await forumsPage.editForum(originalName, newName, 'Updated description');

    // Should show the new name
    await expect(authenticatedPage.getByText(newName)).toBeVisible();
  });

  test('should delete own forum', async ({ authenticatedPage }) => {
    const forumsPage = new ForumsPage(authenticatedPage);
    await forumsPage.goto();

    // Create a forum first
    const forumName = `Deletable ${Date.now()}`;
    await forumsPage.createForum(forumName, 'Forum to be deleted');

    // Verify it exists
    await expect(authenticatedPage.getByText(forumName)).toBeVisible();

    // Delete it
    await forumsPage.deleteForum(forumName);

    // Wait for page to refresh and verify it's gone
    await authenticatedPage.waitForTimeout(1000);
    const exists = await forumsPage.forumExists(forumName);
    expect(exists).toBe(false);
  });
});
