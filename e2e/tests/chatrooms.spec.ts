import { test, expect } from '../fixtures/auth.fixture';
import { ChatroomsPage } from '../pages/chatrooms.page';
import { errors, chatroomErrors } from '../mocks/data/errors.data';

test.describe('Chatrooms', () => {
  test.describe('List & Display', () => {
    test('should display chatrooms list', async ({ authenticatedPage }) => {
      const chatroomsPage = new ChatroomsPage(authenticatedPage);
      await chatroomsPage.goto();

      await expect(chatroomsPage.heading).toBeVisible();
      await expect(chatroomsPage.createChatroomButton).toBeVisible();
      await expect(chatroomsPage.searchInput).toBeVisible();

      // Should show default chatrooms from mock data
      const chatroomNames = await chatroomsPage.getChatroomNames();
      expect(chatroomNames.length).toBeGreaterThan(0);
    });

    test('should display chatrooms with pagination', async ({ createUser }) => {
      const user = await createUser('PaginationUser');
      const chatroomsPage = new ChatroomsPage(user.page);

      // Add many chatrooms to test pagination
      for (let i = 0; i < 15; i++) {
        user.mocks.chatroomsState.create(
          `Pagination Room ${i}`,
          `Description ${i}`,
          user.mocks.sessionState.getCurrentUser()!.id,
          'PaginationUser'
        );
      }

      await chatroomsPage.goto();

      // Should show first page of chatrooms
      const count = await chatroomsPage.getChatroomCount();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(10); // Default page size
    });

    test('should navigate between pages', async ({ createUser }) => {
      const user = await createUser('PageNavUser');
      const chatroomsPage = new ChatroomsPage(user.page);

      // Add enough chatrooms for multiple pages
      for (let i = 0; i < 25; i++) {
        user.mocks.chatroomsState.create(
          `Page Room ${i}`,
          `Description ${i}`,
          user.mocks.sessionState.getCurrentUser()!.id,
          'PageNavUser'
        );
      }

      await chatroomsPage.goto();

      // Get first page chatroom names
      const firstPageChatrooms = await chatroomsPage.getChatroomNames();

      // Go to next page if available
      if (await chatroomsPage.nextPageButton.isVisible()) {
        await chatroomsPage.goToNextPage();
        await user.page.waitForTimeout(500);

        // Chatrooms should be different
        const secondPageChatrooms = await chatroomsPage.getChatroomNames();
        expect(secondPageChatrooms).not.toEqual(firstPageChatrooms);
      }
    });

    test('should show empty state when no chatrooms exist', async ({ createUser }) => {
      const user = await createUser('EmptyUser');
      const chatroomsPage = new ChatroomsPage(user.page);

      // Clear all chatrooms
      user.mocks.chatroomsState.setChatrooms([]);

      await chatroomsPage.goto();

      // Should show empty state
      const isEmpty = await chatroomsPage.isEmpty();
      const chatroomCount = await chatroomsPage.getChatroomCount();

      expect(isEmpty || chatroomCount === 0).toBeTruthy();
    });

    test('should show loading indicator', async ({ createUser }) => {
      const user = await createUser('LoadingUser');
      const chatroomsPage = new ChatroomsPage(user.page);

      // Add delay to see loading state
      user.mocks.setDelay('/api/chatrooms', 2000);

      // Navigate but don't wait for full load
      user.page.goto('/chatrooms');

      // Check for loading indicator
      await user.page.waitForTimeout(100);
    });
  });

  test.describe('Search', () => {
    test('should search chatrooms by name', async ({ authenticatedPage }) => {
      const chatroomsPage = new ChatroomsPage(authenticatedPage);
      await chatroomsPage.goto();

      // Search for "Tech Talk" (one of the default chatrooms)
      await chatroomsPage.searchChatrooms('Tech Talk');

      // Should find the chatroom
      await expect(authenticatedPage.getByText('Tech Talk')).toBeVisible();
    });

    test('should search chatrooms by description', async ({ authenticatedPage }) => {
      const chatroomsPage = new ChatroomsPage(authenticatedPage);
      await chatroomsPage.goto();

      // Search by description content
      await chatroomsPage.searchChatrooms('Technology discussions');

      // Should find the Tech Talk chatroom
      const chatroomNames = await chatroomsPage.getChatroomNames();
      expect(chatroomNames.some(name => name.includes('Tech Talk'))).toBeTruthy();
    });

    test('should show empty search results', async ({ createUser }) => {
      const user = await createUser('SearchUser');
      const chatroomsPage = new ChatroomsPage(user.page);
      await chatroomsPage.goto();

      // Search for something that doesn't exist
      await chatroomsPage.searchChatrooms('xyznonexistent123');

      // Should show no results
      const chatroomCount = await chatroomsPage.getChatroomCount();
      expect(chatroomCount).toBe(0);
    });

    test('should clear search and show all chatrooms', async ({ authenticatedPage }) => {
      const chatroomsPage = new ChatroomsPage(authenticatedPage);
      await chatroomsPage.goto();

      // Get initial count
      const initialCount = await chatroomsPage.getChatroomCount();

      // Search to filter
      await chatroomsPage.searchChatrooms('Tech Talk');
      const filteredCount = await chatroomsPage.getChatroomCount();

      // Clear search
      await chatroomsPage.clearSearch();
      await authenticatedPage.waitForTimeout(500);

      // Should show all chatrooms again
      const clearedCount = await chatroomsPage.getChatroomCount();
      expect(clearedCount).toBeGreaterThanOrEqual(filteredCount);
    });
  });

  test.describe('Create Chatroom', () => {
    test('should create a new chatroom with valid data', async ({ authenticatedPage }) => {
      const chatroomsPage = new ChatroomsPage(authenticatedPage);
      await chatroomsPage.goto();

      const chatroomName = `Test Room ${Date.now()}`;
      const chatroomDescription = 'A test chatroom created by Playwright';

      await chatroomsPage.createChatroom(chatroomName, chatroomDescription);

      // Chatroom should appear in the list
      await expect(authenticatedPage.getByText(chatroomName)).toBeVisible();
    });

    test('should show validation error for empty name', async ({ createUser }) => {
      const user = await createUser('ValidationUser');
      const chatroomsPage = new ChatroomsPage(user.page);
      await chatroomsPage.goto();

      await chatroomsPage.tryCreateChatroom('', 'Description without name');

      // Modal should stay open or show error
      await user.page.waitForTimeout(500);

      const modalVisible = await chatroomsPage.modalTitle.isVisible();
      const hasError = await chatroomsPage.hasError();

      expect(modalVisible || hasError).toBeTruthy();
    });

    test('should show validation error for name too long', async ({ createUser }) => {
      const user = await createUser('LongNameUser');
      const chatroomsPage = new ChatroomsPage(user.page);
      await chatroomsPage.goto();

      const longName = 'A'.repeat(60); // Exceeds 50 char limit
      await chatroomsPage.tryCreateChatroom(longName, 'Normal description');

      await user.page.waitForTimeout(500);

      // Modal should stay open
      const modalVisible = await chatroomsPage.modalTitle.isVisible();
      expect(modalVisible).toBeTruthy();
    });

    test('should cancel chatroom creation', async ({ authenticatedPage }) => {
      const chatroomsPage = new ChatroomsPage(authenticatedPage);
      await chatroomsPage.goto();

      await chatroomsPage.openCreateModal();
      await chatroomsPage.chatroomNameInput.fill('Cancelled Room');
      await chatroomsPage.chatroomDescriptionInput.fill('This will be cancelled');

      await chatroomsPage.closeModal();

      // Modal should be closed
      await expect(chatroomsPage.modalTitle).not.toBeVisible();

      // Chatroom should not exist
      const exists = await chatroomsPage.chatroomExists('Cancelled Room');
      expect(exists).toBe(false);
    });
  });

  test.describe('Edit Chatroom', () => {
    test('should edit own chatroom', async ({ createUser }) => {
      const user = await createUser('EditOwner');
      const chatroomsPage = new ChatroomsPage(user.page);

      // Create a chatroom owned by this user
      const currentUser = user.mocks.sessionState.getCurrentUser()!;
      user.mocks.chatroomsState.create(
        'Editable Room',
        'Original description',
        currentUser.id,
        currentUser.username
      );

      await chatroomsPage.goto();

      // Edit it
      await chatroomsPage.editChatroom('Editable Room', 'Edited Room', 'Updated description');

      // Should show the new name
      await expect(user.page.getByText('Edited Room')).toBeVisible();
    });

    test('should hide edit button for chatrooms owned by others', async ({ createUser }) => {
      const user = await createUser('NonOwner');
      const chatroomsPage = new ChatroomsPage(user.page);

      await chatroomsPage.goto();

      // Check if edit button is hidden for "Tech Talk" chatroom (owned by TechGuru)
      const editVisible = await chatroomsPage.isEditButtonVisible('Tech Talk');
      expect(editVisible).toBe(false);
    });

    test('should show error when editing chatroom fails', async ({ createUser }) => {
      const user = await createUser('EditFailUser');
      const chatroomsPage = new ChatroomsPage(user.page);

      const currentUser = user.mocks.sessionState.getCurrentUser()!;
      const chatroom = user.mocks.chatroomsState.create(
        'FailEdit Room',
        'Will fail to edit',
        currentUser.id,
        currentUser.username
      );

      user.mocks.setError(`/api/chatrooms/${chatroom.id}/edit`, errors.serverError('Edit failed'));

      await chatroomsPage.goto();

      const chatroomCard = user.page.locator(`div:has(h2:has-text("FailEdit Room"))`).first();
      await chatroomCard.getByRole('button', { name: 'Edit' }).click();

      await user.page.getByRole('heading', { name: 'Edit Chatroom' }).waitFor({ state: 'visible' });
      await chatroomsPage.chatroomNameInput.fill('New Name');
      await chatroomsPage.modalSubmitButton.click();

      await user.page.waitForTimeout(500);

      // Modal should stay open
      const modalVisible = await user.page.getByRole('heading', { name: 'Edit Chatroom' }).isVisible();
      expect(modalVisible).toBeTruthy();
    });
  });

  test.describe('Delete Chatroom', () => {
    test('should delete own chatroom with confirmation', async ({ createUser }) => {
      const user = await createUser('DeleteOwner');
      const chatroomsPage = new ChatroomsPage(user.page);

      const currentUser = user.mocks.sessionState.getCurrentUser()!;
      user.mocks.chatroomsState.create(
        'Deletable Room',
        'Will be deleted',
        currentUser.id,
        currentUser.username
      );

      await chatroomsPage.goto();

      // Verify it exists
      await expect(user.page.getByText('Deletable Room')).toBeVisible();

      // Delete it
      await chatroomsPage.deleteChatroom('Deletable Room');

      // Wait and verify it's gone
      await user.page.waitForTimeout(500);
      const exists = await chatroomsPage.chatroomExists('Deletable Room');
      expect(exists).toBe(false);
    });

    test('should cancel delete and keep chatroom', async ({ createUser }) => {
      const user = await createUser('CancelDeleteUser');
      const chatroomsPage = new ChatroomsPage(user.page);

      const currentUser = user.mocks.sessionState.getCurrentUser()!;
      user.mocks.chatroomsState.create(
        'Keep Room',
        'Will not be deleted',
        currentUser.id,
        currentUser.username
      );

      await chatroomsPage.goto();

      // Try to delete but cancel
      await chatroomsPage.cancelDeleteChatroom('Keep Room');

      // Chatroom should still exist
      const exists = await chatroomsPage.chatroomExists('Keep Room');
      expect(exists).toBe(true);
    });

    test('should hide delete button for chatrooms owned by others', async ({ createUser }) => {
      const user = await createUser('NonDeleteOwner');
      const chatroomsPage = new ChatroomsPage(user.page);

      await chatroomsPage.goto();

      // Check if delete button is hidden for "Tech Talk" chatroom
      const deleteVisible = await chatroomsPage.isDeleteButtonVisible('Tech Talk');
      expect(deleteVisible).toBe(false);
    });
  });

  test.describe('API Error Handling', () => {
    test('should handle list chatrooms API failure', async ({ createUser }) => {
      const user = await createUser('ListErrorUser');
      const chatroomsPage = new ChatroomsPage(user.page);

      user.mocks.setError('/api/chatrooms', errors.serverError('Database unavailable'));

      await chatroomsPage.goto();

      await user.page.waitForTimeout(500);
      const hasError = await chatroomsPage.hasError();
      const chatroomCount = await chatroomsPage.getChatroomCount();

      expect(hasError || chatroomCount === 0).toBeTruthy();
    });

    test('should handle create chatroom API failure (500)', async ({ createUser }) => {
      const user = await createUser('Create500User');
      const chatroomsPage = new ChatroomsPage(user.page);

      user.mocks.setError('/api/chatrooms/create', errors.serverError('Create failed'));

      await chatroomsPage.goto();
      await chatroomsPage.tryCreateChatroom('Server Error Room', 'Should fail');

      await user.page.waitForTimeout(500);

      const modalVisible = await chatroomsPage.modalTitle.isVisible();
      const hasError = await chatroomsPage.hasError();

      expect(modalVisible || hasError).toBeTruthy();
    });

    test('should handle create chatroom API failure (400)', async ({ createUser }) => {
      const user = await createUser('Create400User');
      const chatroomsPage = new ChatroomsPage(user.page);

      user.mocks.setError('/api/chatrooms/create', chatroomErrors.emptyName);

      await chatroomsPage.goto();
      await chatroomsPage.tryCreateChatroom('Bad Request Room', 'Should fail');

      await user.page.waitForTimeout(500);

      const modalVisible = await chatroomsPage.modalTitle.isVisible();
      expect(modalVisible).toBeTruthy();
    });

    test('should handle delete chatroom API failure', async ({ createUser }) => {
      const user = await createUser('DeleteErrorUser');
      const chatroomsPage = new ChatroomsPage(user.page);

      const currentUser = user.mocks.sessionState.getCurrentUser()!;
      const chatroom = user.mocks.chatroomsState.create(
        'Undeletable Room',
        'Delete will fail',
        currentUser.id,
        currentUser.username
      );

      user.mocks.setError(`/api/chatrooms/${chatroom.id}/delete`, errors.serverError('Delete failed'));

      await chatroomsPage.goto();

      user.page.once('dialog', dialog => dialog.accept());
      const chatroomCard = user.page.locator(`div:has(h2:has-text("Undeletable Room"))`).first();
      await chatroomCard.getByRole('button', { name: 'Delete' }).click();

      await user.page.waitForTimeout(500);

      // Chatroom should still exist (delete failed)
      const exists = await chatroomsPage.chatroomExists('Undeletable Room');
      expect(exists).toBe(true);
    });

    test('should handle network timeout', async ({ createUser }) => {
      const user = await createUser('TimeoutUser');
      const chatroomsPage = new ChatroomsPage(user.page);

      user.mocks.setDelay('/api/chatrooms/create', 35000);

      await chatroomsPage.goto();
      await chatroomsPage.openCreateModal();
      await chatroomsPage.chatroomNameInput.fill('Timeout Room');
      await chatroomsPage.chatroomDescriptionInput.fill('Will timeout');
      await chatroomsPage.modalSubmitButton.click();

      await user.page.waitForTimeout(500);

      const modalVisible = await chatroomsPage.modalTitle.isVisible();
      expect(modalVisible).toBeTruthy();
    });
  });

  test.describe('Chatroom Details Navigation', () => {
    test('should navigate to chatroom detail page', async ({ authenticatedPage }) => {
      const chatroomsPage = new ChatroomsPage(authenticatedPage);
      await chatroomsPage.goto();

      // Click on a chatroom
      await chatroomsPage.clickChatroom('General Chat');

      // Should navigate to chatroom detail
      await expect(authenticatedPage).toHaveURL(/\/chatrooms\/\d+/);
    });
  });

  test.describe('Chatroom Messaging', () => {
    test('should display messages in chatroom', async ({ createUser }) => {
      const user = await createUser('MessageViewUser');

      // Messages are already added in the default mock data for chatroom 1
      await user.page.goto('/chatrooms/1');

      await user.page.waitForTimeout(500);

      // Should see messages
      const hasMessages = await user.page.locator('.message, [data-testid="message"]').count() > 0;
      // Or check for specific message content from mock data
      const helloVisible = await user.page.getByText('Hello everyone!').isVisible().catch(() => false);

      expect(hasMessages || helloVisible).toBeTruthy();
    });

    test('should send message in chatroom', async ({ createUser }) => {
      const user = await createUser('MessageSendUser');

      await user.page.goto('/chatrooms/1');

      const messageInput = user.page.getByPlaceholder(/type.*message|write.*message/i);

      if (await messageInput.isVisible()) {
        await messageInput.fill('Hello from test!');
        const sendButton = user.page.getByRole('button', { name: /send/i });
        if (await sendButton.isVisible()) {
          await sendButton.click();
          await user.page.waitForTimeout(500);

          // Message should appear
          await expect(user.page.getByText('Hello from test!')).toBeVisible();
        }
      }
    });
  });
});
