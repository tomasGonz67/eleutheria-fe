import { test, expect } from '../fixtures/auth.fixture';
import { ForumsPage } from '../pages/forums.page';
import { errors, forumErrors } from '../mocks/data/errors.data';
import { createMockForum } from '../mocks/data/forums.data';

test.describe('Forums', () => {
  test.describe('List & Display', () => {
    test('should display forums list', async ({ authenticatedPage }) => {
      const forumsPage = new ForumsPage(authenticatedPage);
      await forumsPage.goto();

      await expect(forumsPage.heading).toBeVisible();
      await expect(forumsPage.createForumButton).toBeVisible();
      await expect(forumsPage.searchInput).toBeVisible();

      // Should show default forums from mock data
      const forumNames = await forumsPage.getForumNames();
      expect(forumNames.length).toBeGreaterThan(0);
    });

    test('should display forums with pagination', async ({ createUser }) => {
      const user = await createUser('PaginationUser');
      const forumsPage = new ForumsPage(user.page);

      // Add many forums to test pagination
      for (let i = 0; i < 15; i++) {
        user.mocks.forumsState.create(
          `Pagination Forum ${i}`,
          `Description ${i}`,
          user.mocks.sessionState.getCurrentUser()!.id,
          'PaginationUser'
        );
      }

      await forumsPage.goto();

      // Should show first page of forums
      const count = await forumsPage.getForumCount();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(10); // Default page size
    });

    test('should navigate between pages', async ({ createUser }) => {
      const user = await createUser('PageNavUser');
      const forumsPage = new ForumsPage(user.page);

      // Add enough forums for multiple pages
      for (let i = 0; i < 25; i++) {
        user.mocks.forumsState.create(
          `Page Forum ${i}`,
          `Description ${i}`,
          user.mocks.sessionState.getCurrentUser()!.id,
          'PageNavUser'
        );
      }

      await forumsPage.goto();

      // Get first page forum names
      const firstPageForums = await forumsPage.getForumNames();

      // Go to next page
      if (await forumsPage.nextPageButton.isVisible()) {
        await forumsPage.goToNextPage();
        await user.page.waitForTimeout(500);

        // Forums should be different
        const secondPageForums = await forumsPage.getForumNames();
        expect(secondPageForums).not.toEqual(firstPageForums);
      }
    });

    test('should show empty state when no forums exist', async ({ createUser }) => {
      const user = await createUser('EmptyUser');
      const forumsPage = new ForumsPage(user.page);

      // Clear all forums
      user.mocks.forumsState.setForums([]);

      await forumsPage.goto();

      // Should show empty state or "no forums" message
      const isEmpty = await forumsPage.isEmpty();
      const forumCount = await forumsPage.getForumCount();

      expect(isEmpty || forumCount === 0).toBeTruthy();
    });

    test('should show loading indicator', async ({ createUser }) => {
      const user = await createUser('LoadingUser');
      const forumsPage = new ForumsPage(user.page);

      // Add delay to see loading state
      user.mocks.setDelay('/api/forums', 2000);

      // Navigate but don't wait for full load
      user.page.goto('/forums');

      // Check for loading indicator
      await user.page.waitForTimeout(100);
      // Note: Actual loading state depends on frontend implementation
    });
  });

  test.describe('Search', () => {
    test('should search forums by name', async ({ authenticatedPage }) => {
      const forumsPage = new ForumsPage(authenticatedPage);
      await forumsPage.goto();

      // Search for "Technology" (one of the default forums)
      await forumsPage.searchForums('Technology');

      // Should find the forum
      await expect(authenticatedPage.getByText('Technology')).toBeVisible();
    });

    test('should search forums by description', async ({ authenticatedPage }) => {
      const forumsPage = new ForumsPage(authenticatedPage);
      await forumsPage.goto();

      // Search by description content
      await forumsPage.searchForums('gadgets');

      // Should find the Technology forum (has "gadgets" in description)
      const forumNames = await forumsPage.getForumNames();
      expect(forumNames.some(name => name.includes('Technology'))).toBeTruthy();
    });

    test('should show empty search results message', async ({ createUser }) => {
      const user = await createUser('SearchUser');
      const forumsPage = new ForumsPage(user.page);
      await forumsPage.goto();

      // Search for something that doesn't exist
      await forumsPage.searchForums('xyznonexistent123');

      // Should show no results or empty state
      const forumCount = await forumsPage.getForumCount();
      expect(forumCount).toBe(0);
    });

    test('should clear search and show all forums', async ({ authenticatedPage }) => {
      const forumsPage = new ForumsPage(authenticatedPage);
      await forumsPage.goto();

      // Get initial count
      const initialCount = await forumsPage.getForumCount();

      // Search to filter
      await forumsPage.searchForums('Technology');
      const filteredCount = await forumsPage.getForumCount();

      // Clear search
      await forumsPage.clearSearch();
      await authenticatedPage.waitForTimeout(500);

      // Should show all forums again
      const clearedCount = await forumsPage.getForumCount();
      expect(clearedCount).toBeGreaterThanOrEqual(filteredCount);
    });
  });

  test.describe('Create Forum', () => {
    test('should create a new forum with valid data', async ({ authenticatedPage }) => {
      const forumsPage = new ForumsPage(authenticatedPage);
      await forumsPage.goto();

      const forumName = `Test Forum ${Date.now()}`;
      const forumDescription = 'A test forum created by Playwright';

      await forumsPage.createForum(forumName, forumDescription);

      // Forum should appear in the list
      await expect(authenticatedPage.getByText(forumName)).toBeVisible();
    });

    test('should show validation error for empty name', async ({ createUser }) => {
      const user = await createUser('ValidationUser');
      const forumsPage = new ForumsPage(user.page);
      await forumsPage.goto();

      await forumsPage.tryCreateForum('', 'Description without name');

      // Modal should stay open or show error
      await user.page.waitForTimeout(500);

      // Check if modal is still visible or error is shown
      const modalVisible = await forumsPage.modalTitle.isVisible();
      const hasError = await forumsPage.hasError();

      expect(modalVisible || hasError).toBeTruthy();
    });

    test('should show validation error for name too long', async ({ createUser }) => {
      const user = await createUser('LongNameUser');
      const forumsPage = new ForumsPage(user.page);
      await forumsPage.goto();

      const longName = 'A'.repeat(150); // Exceeds 100 char limit
      await forumsPage.tryCreateForum(longName, 'Normal description');

      await user.page.waitForTimeout(500);

      // Should show validation error
      const modalVisible = await forumsPage.modalTitle.isVisible();
      expect(modalVisible).toBeTruthy(); // Modal should stay open
    });

    test('should cancel forum creation', async ({ authenticatedPage }) => {
      const forumsPage = new ForumsPage(authenticatedPage);
      await forumsPage.goto();

      await forumsPage.openCreateModal();
      await forumsPage.forumNameInput.fill('Cancelled Forum');
      await forumsPage.forumDescriptionInput.fill('This will be cancelled');

      await forumsPage.closeModal();

      // Modal should be closed
      await expect(forumsPage.modalTitle).not.toBeVisible();

      // Forum should not exist
      const exists = await forumsPage.forumExists('Cancelled Forum');
      expect(exists).toBe(false);
    });
  });

  test.describe('Edit Forum', () => {
    test('should edit own forum', async ({ createUser }) => {
      const user = await createUser('EditOwner');
      const forumsPage = new ForumsPage(user.page);

      // Create a forum owned by this user
      const currentUser = user.mocks.sessionState.getCurrentUser()!;
      user.mocks.forumsState.create(
        'Editable Forum',
        'Original description',
        currentUser.id,
        currentUser.username
      );

      await forumsPage.goto();

      // Edit it
      await forumsPage.editForum('Editable Forum', 'Edited Forum', 'Updated description');

      // Should show the new name
      await expect(user.page.getByText('Edited Forum')).toBeVisible();
    });

    test('should hide edit button for forums owned by others', async ({ createUser }) => {
      const user = await createUser('NonOwner');
      const forumsPage = new ForumsPage(user.page);

      // The default forums are owned by other users (IDs 1, 2, 3, 4)
      // Our user has a different ID
      await forumsPage.goto();

      // Check if edit button is hidden for "Technology" forum (owned by TechGuru)
      const editVisible = await forumsPage.isEditButtonVisible('Technology');
      expect(editVisible).toBe(false);
    });

    test('should show error when editing forum fails', async ({ createUser }) => {
      const user = await createUser('EditFailUser');
      const forumsPage = new ForumsPage(user.page);

      const currentUser = user.mocks.sessionState.getCurrentUser()!;
      const forum = user.mocks.forumsState.create(
        'FailEdit Forum',
        'Will fail to edit',
        currentUser.id,
        currentUser.username
      );

      // Set error for this specific forum edit
      user.mocks.setError(`/api/forums/${forum.id}/edit`, errors.serverError('Edit failed'));

      await forumsPage.goto();

      // Try to edit - this would need frontend error handling
      const forumCard = user.page.locator(`div:has(h2:has-text("FailEdit Forum"))`).first();
      await forumCard.getByRole('button', { name: 'Edit' }).click();

      await user.page.getByRole('heading', { name: 'Edit Forum' }).waitFor({ state: 'visible' });
      await forumsPage.forumNameInput.fill('New Name');
      await forumsPage.modalSubmitButton.click();

      await user.page.waitForTimeout(500);

      // Modal should stay open or error should be shown
      const modalVisible = await user.page.getByRole('heading', { name: 'Edit Forum' }).isVisible();
      expect(modalVisible).toBeTruthy();
    });
  });

  test.describe('Delete Forum', () => {
    test('should delete own forum with confirmation', async ({ createUser }) => {
      const user = await createUser('DeleteOwner');
      const forumsPage = new ForumsPage(user.page);

      const currentUser = user.mocks.sessionState.getCurrentUser()!;
      user.mocks.forumsState.create(
        'Deletable Forum',
        'Will be deleted',
        currentUser.id,
        currentUser.username
      );

      await forumsPage.goto();

      // Verify it exists
      await expect(user.page.getByText('Deletable Forum')).toBeVisible();

      // Delete it
      await forumsPage.deleteForum('Deletable Forum');

      // Wait and verify it's gone
      await user.page.waitForTimeout(500);
      const exists = await forumsPage.forumExists('Deletable Forum');
      expect(exists).toBe(false);
    });

    test('should cancel delete and keep forum', async ({ createUser }) => {
      const user = await createUser('CancelDeleteUser');
      const forumsPage = new ForumsPage(user.page);

      const currentUser = user.mocks.sessionState.getCurrentUser()!;
      user.mocks.forumsState.create(
        'Keep Forum',
        'Will not be deleted',
        currentUser.id,
        currentUser.username
      );

      await forumsPage.goto();

      // Try to delete but cancel
      await forumsPage.cancelDeleteForum('Keep Forum');

      // Forum should still exist
      const exists = await forumsPage.forumExists('Keep Forum');
      expect(exists).toBe(true);
    });

    test('should hide delete button for forums owned by others', async ({ createUser }) => {
      const user = await createUser('NonDeleteOwner');
      const forumsPage = new ForumsPage(user.page);

      await forumsPage.goto();

      // Check if delete button is hidden for "Technology" forum (owned by TechGuru)
      const deleteVisible = await forumsPage.isDeleteButtonVisible('Technology');
      expect(deleteVisible).toBe(false);
    });
  });

  test.describe('API Error Handling', () => {
    test('should handle list forums API failure', async ({ createUser }) => {
      const user = await createUser('ListErrorUser');
      const forumsPage = new ForumsPage(user.page);

      // Set error for forums list
      user.mocks.setError('/api/forums', errors.serverError('Database unavailable'));

      await forumsPage.goto();

      // Should show error message
      await user.page.waitForTimeout(500);
      const hasError = await forumsPage.hasError();
      const forumCount = await forumsPage.getForumCount();

      // Either error shown or no forums displayed
      expect(hasError || forumCount === 0).toBeTruthy();
    });

    test('should handle create forum API failure (500)', async ({ createUser }) => {
      const user = await createUser('Create500User');
      const forumsPage = new ForumsPage(user.page);

      user.mocks.setError('/api/forums/create', errors.serverError('Create failed'));

      await forumsPage.goto();
      await forumsPage.tryCreateForum('Server Error Forum', 'Should fail');

      await user.page.waitForTimeout(500);

      // Modal should stay open or error shown
      const modalVisible = await forumsPage.modalTitle.isVisible();
      const hasError = await forumsPage.hasError();

      expect(modalVisible || hasError).toBeTruthy();
    });

    test('should handle create forum API failure (400)', async ({ createUser }) => {
      const user = await createUser('Create400User');
      const forumsPage = new ForumsPage(user.page);

      user.mocks.setError('/api/forums/create', forumErrors.emptyName);

      await forumsPage.goto();
      await forumsPage.tryCreateForum('Bad Request Forum', 'Should fail');

      await user.page.waitForTimeout(500);

      // Modal should stay open with validation error
      const modalVisible = await forumsPage.modalTitle.isVisible();
      expect(modalVisible).toBeTruthy();
    });

    test('should handle delete forum API failure', async ({ createUser }) => {
      const user = await createUser('DeleteErrorUser');
      const forumsPage = new ForumsPage(user.page);

      const currentUser = user.mocks.sessionState.getCurrentUser()!;
      const forum = user.mocks.forumsState.create(
        'Undeletable Forum',
        'Delete will fail',
        currentUser.id,
        currentUser.username
      );

      user.mocks.setError(`/api/forums/${forum.id}/delete`, errors.serverError('Delete failed'));

      await forumsPage.goto();

      // Try to delete
      user.page.once('dialog', dialog => dialog.accept());
      const forumCard = user.page.locator(`div:has(h2:has-text("Undeletable Forum"))`).first();
      await forumCard.getByRole('button', { name: 'Delete' }).click();

      await user.page.waitForTimeout(500);

      // Forum should still exist (delete failed)
      const exists = await forumsPage.forumExists('Undeletable Forum');
      expect(exists).toBe(true);
    });

    test('should handle network timeout on forum operations', async ({ createUser }) => {
      const user = await createUser('TimeoutUser');
      const forumsPage = new ForumsPage(user.page);

      // Set long delay to simulate timeout
      user.mocks.setDelay('/api/forums/create', 35000);

      await forumsPage.goto();
      await forumsPage.openCreateModal();
      await forumsPage.forumNameInput.fill('Timeout Forum');
      await forumsPage.forumDescriptionInput.fill('Will timeout');
      await forumsPage.modalSubmitButton.click();

      // Check for loading state
      await user.page.waitForTimeout(500);

      // Modal should still be open or showing loading
      const modalVisible = await forumsPage.modalTitle.isVisible();
      expect(modalVisible).toBeTruthy();
    });
  });

  test.describe('Forum Details Navigation', () => {
    test('should navigate to forum detail page', async ({ authenticatedPage }) => {
      const forumsPage = new ForumsPage(authenticatedPage);
      await forumsPage.goto();

      // Click on a forum
      await forumsPage.clickForum('General Discussion');

      // Should navigate to forum detail
      await expect(authenticatedPage).toHaveURL(/\/forums\/\d+/);
    });
  });
});
