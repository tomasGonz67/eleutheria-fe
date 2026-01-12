import { test, expect } from '../fixtures/auth.fixture';
import { RandomChatPage } from '../pages/random-chat.page';

test.describe('Random Chat', () => {
  test('should enter and cancel waiting queue', async ({ authenticatedPage }) => {
    const chatPage = new RandomChatPage(authenticatedPage);
    await chatPage.goto();

    // Should start in idle state
    await expect(chatPage.startChatButton).toBeVisible();

    // Start searching
    await chatPage.startSearch();

    // Should be in waiting state
    await expect(chatPage.waitingText).toBeVisible();
    await expect(chatPage.cancelSearchButton).toBeVisible();

    // Cancel search
    await chatPage.cancelSearch();

    // Should return to idle state
    await expect(chatPage.startChatButton).toBeVisible();
  });

  test('should match two users and exchange messages', async ({ createUser }) => {
    // Create two separate browser contexts with different users
    const user1 = await createUser('ChatUser1');
    const user2 = await createUser('ChatUser2');

    const chatPage1 = new RandomChatPage(user1.page);
    const chatPage2 = new RandomChatPage(user2.page);

    // Both navigate to random chat
    await chatPage1.goto();
    await chatPage2.goto();

    // User1 starts searching
    await chatPage1.startSearch();
    await expect(chatPage1.waitingText).toBeVisible();

    // User2 starts searching - should match with User1
    await chatPage2.startSearch();

    // Both should be matched
    await chatPage1.waitForMatch();
    await chatPage2.waitForMatch();

    // User1 sends a message
    await chatPage1.sendMessage('Hello from User1!');

    // User2 should receive it
    await chatPage2.waitForMessage('Hello from User1!');

    // User2 responds
    await chatPage2.sendMessage('Hi User1, nice to meet you!');

    // User1 should receive the response
    await chatPage1.waitForMessage('Hi User1, nice to meet you!');
  });

  test('should handle partner leaving chat', async ({ createUser }) => {
    const user1 = await createUser('Leaver1');
    const user2 = await createUser('Leaver2');

    const chatPage1 = new RandomChatPage(user1.page);
    const chatPage2 = new RandomChatPage(user2.page);

    await chatPage1.goto();
    await chatPage2.goto();

    // Match both users
    await chatPage1.startSearch();
    await chatPage2.startSearch();
    await chatPage1.waitForMatch();
    await chatPage2.waitForMatch();

    // User2 leaves
    await chatPage2.leaveChat();

    // User1 should see chat ended (input disabled with "Chat has ended" placeholder)
    await chatPage1.waitForChatEnded();

    // User1's message input should be disabled
    await expect(chatPage1.messageInput).toBeDisabled();
  });
});
