import { test, expect } from '../fixtures/auth.fixture';
import { ChatroomsPage } from '../pages/chatrooms.page';

test.describe('Chatrooms', () => {
  test('should display chatrooms list', async ({ authenticatedPage }) => {
    const chatroomsPage = new ChatroomsPage(authenticatedPage);
    await chatroomsPage.goto();

    await expect(chatroomsPage.heading).toBeVisible();
    await expect(chatroomsPage.createChatroomButton).toBeVisible();
    await expect(chatroomsPage.searchInput).toBeVisible();
  });

  test('should create a new chatroom', async ({ authenticatedPage }) => {
    const chatroomsPage = new ChatroomsPage(authenticatedPage);
    await chatroomsPage.goto();

    const chatroomName = `Test Room ${Date.now()}`;
    const chatroomDescription = 'A test chatroom created by Playwright';

    await chatroomsPage.createChatroom(chatroomName, chatroomDescription);

    // Chatroom should appear in the list
    await expect(authenticatedPage.getByText(chatroomName)).toBeVisible();
  });

  test('should search chatrooms', async ({ authenticatedPage }) => {
    const chatroomsPage = new ChatroomsPage(authenticatedPage);
    await chatroomsPage.goto();

    // First create a chatroom to search for
    const uniqueName = `Search Room ${Date.now()}`;
    await chatroomsPage.createChatroom(uniqueName, 'Chatroom for search test');

    // Search for it
    await chatroomsPage.searchChatrooms(uniqueName);

    // Should find the chatroom
    await expect(authenticatedPage.getByText(uniqueName)).toBeVisible();
  });

  test('should delete own chatroom', async ({ authenticatedPage }) => {
    const chatroomsPage = new ChatroomsPage(authenticatedPage);
    await chatroomsPage.goto();

    // Create a chatroom first
    const chatroomName = `Delete Room ${Date.now()}`;
    await chatroomsPage.createChatroom(chatroomName, 'Chatroom to be deleted');

    // Verify it exists
    await expect(authenticatedPage.getByText(chatroomName)).toBeVisible();

    // Delete it
    await chatroomsPage.deleteChatroom(chatroomName);

    // Wait for page to refresh and verify it's gone
    await authenticatedPage.waitForTimeout(1000);
    const exists = await chatroomsPage.chatroomExists(chatroomName);
    expect(exists).toBe(false);
  });
});
