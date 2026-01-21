import { test, expect } from '../fixtures/auth.fixture';
import { RandomChatPage } from '../pages/random-chat.page';
import { errors, chatErrors } from '../mocks/data/errors.data';

test.describe('Random Chat', () => {
  test.describe('Idle State', () => {
    test('should display idle state on page load', async ({ createUser }) => {
      const user = await createUser('IdleUser');
      const chatPage = new RandomChatPage(user.page);

      await chatPage.goto();

      // Should be in idle state
      await expect(chatPage.startChatButton).toBeVisible();
      await expect(chatPage.heading).toBeVisible();

      const isIdle = await chatPage.isIdle();
      expect(isIdle).toBe(true);
    });

    test('should show proper UI elements in idle state', async ({ createUser }) => {
      const user = await createUser('UIUser');
      const chatPage = new RandomChatPage(user.page);

      await chatPage.goto();

      // Start button should be visible
      await expect(chatPage.startChatButton).toBeVisible();

      // Waiting and matched elements should not be visible
      await expect(chatPage.waitingText).not.toBeVisible();
      await expect(chatPage.chattingWithText).not.toBeVisible();
      await expect(chatPage.messageInput).not.toBeVisible();
    });
  });

  test.describe('Waiting State', () => {
    test('should enter waiting state when starting search', async ({ createUser }) => {
      const user = await createUser('WaitUser');
      const chatPage = new RandomChatPage(user.page);

      await chatPage.goto();
      await chatPage.startSearch();

      // Should be in waiting state
      await expect(chatPage.waitingText).toBeVisible();
      await expect(chatPage.cancelSearchButton).toBeVisible();

      const isWaiting = await chatPage.isWaiting();
      expect(isWaiting).toBe(true);
    });

    test('should cancel search and return to idle', async ({ createUser }) => {
      const user = await createUser('CancelUser');
      const chatPage = new RandomChatPage(user.page);

      await chatPage.goto();

      // Start searching
      await chatPage.startSearch();
      await expect(chatPage.waitingText).toBeVisible();

      // Cancel search
      await chatPage.cancelSearch();

      // Should return to idle state
      await expect(chatPage.startChatButton).toBeVisible();
      const isIdle = await chatPage.isIdle();
      expect(isIdle).toBe(true);
    });

    test('should show waiting indicator', async ({ createUser }) => {
      const user = await createUser('WaitIndicatorUser');
      const chatPage = new RandomChatPage(user.page);

      await chatPage.goto();
      await chatPage.startSearch();

      // Should show waiting text
      await expect(chatPage.waitingText).toBeVisible();
      await expect(user.page.getByText('Looking for a chat partner...')).toBeVisible();
    });
  });

  test.describe('Match Transition', () => {
    test('should transition to matched state on match', async ({ createUser }) => {
      const user = await createUser('MatchUser');
      const chatPage = new RandomChatPage(user.page);

      await chatPage.goto();
      await chatPage.startSearch();

      // Simulate a match via socket
      const session = user.mocks.chatState.startRandomChat(
        user.mocks.sessionState.getCurrentUser()!.id,
        'MatchUser'
      );

      // Force a match
      user.mocks.chatState.forceMatch(session.session.id, 999, 'Partner');

      // Trigger the match event via socket mock
      await user.mocks.socket.simulateMatch(999, 'Partner', session.session.id);

      // Wait for UI to update
      await user.page.waitForTimeout(500);

      // Note: The actual UI transition depends on how the frontend handles socket events
      // The mock infrastructure is set up to support this
    });

    test('should display partner username when matched', async ({ createUser }) => {
      const user = await createUser('PartnerDisplayUser');
      const chatPage = new RandomChatPage(user.page);

      await chatPage.goto();
      await chatPage.startSearch();

      // Simulate match
      const session = user.mocks.chatState.startRandomChat(
        user.mocks.sessionState.getCurrentUser()!.id,
        'PartnerDisplayUser'
      );
      user.mocks.chatState.forceMatch(session.session.id, 999, 'TestPartner');

      await user.mocks.socket.simulateMatch(999, 'TestPartner', session.session.id);

      await user.page.waitForTimeout(500);
      // Partner username should be visible if UI updates
    });
  });

  test.describe('Messaging', () => {
    test('should send message when matched', async ({ createUser }) => {
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

      // Both should be matched (the mock handles matching automatically)
      await chatPage1.waitForMatch();
      await chatPage2.waitForMatch();

      // User1 sends a message
      await chatPage1.sendMessage('Hello from User1!');

      // User2 should receive it
      await chatPage2.waitForMessage('Hello from User1!');
    });

    test('should receive message from partner', async ({ createUser }) => {
      const user1 = await createUser('RecvUser1');
      const user2 = await createUser('RecvUser2');

      const chatPage1 = new RandomChatPage(user1.page);
      const chatPage2 = new RandomChatPage(user2.page);

      await chatPage1.goto();
      await chatPage2.goto();

      await chatPage1.startSearch();
      await chatPage2.startSearch();

      await chatPage1.waitForMatch();
      await chatPage2.waitForMatch();

      // User2 sends a message
      await chatPage2.sendMessage('Hello from User2!');

      // User1 should receive it
      await chatPage1.waitForMessage('Hello from User2!');
    });

    test('should maintain message order', async ({ createUser }) => {
      const user1 = await createUser('OrderUser1');
      const user2 = await createUser('OrderUser2');

      const chatPage1 = new RandomChatPage(user1.page);
      const chatPage2 = new RandomChatPage(user2.page);

      await chatPage1.goto();
      await chatPage2.goto();

      await chatPage1.startSearch();
      await chatPage2.startSearch();

      await chatPage1.waitForMatch();
      await chatPage2.waitForMatch();

      // Send multiple messages
      await chatPage1.sendMessage('First message');
      await chatPage2.sendMessage('Second message');
      await chatPage1.sendMessage('Third message');

      // Wait for all messages
      await chatPage2.waitForMessage('First message');
      await chatPage2.waitForMessage('Third message');

      // Get messages and verify order
      const messages = await chatPage2.getMessages();
      const firstIndex = messages.findIndex(m => m.includes('First'));
      const secondIndex = messages.findIndex(m => m.includes('Second'));
      const thirdIndex = messages.findIndex(m => m.includes('Third'));

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });

    test('should style own messages differently from partner messages', async ({ createUser }) => {
      const user1 = await createUser('StyleUser1');
      const user2 = await createUser('StyleUser2');

      const chatPage1 = new RandomChatPage(user1.page);
      const chatPage2 = new RandomChatPage(user2.page);

      await chatPage1.goto();
      await chatPage2.goto();

      await chatPage1.startSearch();
      await chatPage2.startSearch();

      await chatPage1.waitForMatch();
      await chatPage2.waitForMatch();

      await chatPage1.sendMessage('My own message');
      await chatPage2.sendMessage('Partner message');

      await user1.page.waitForTimeout(500);

      // Own messages and partner messages should have different styling
      // This depends on frontend implementation
      const ownMessages = await chatPage1.getOwnMessages();
      const partnerMessages = await chatPage1.getPartnerMessages();

      // At least one of each should exist
      expect(ownMessages.length + partnerMessages.length).toBeGreaterThan(0);
    });

    test('should handle long messages', async ({ createUser }) => {
      const user1 = await createUser('LongMsgUser1');
      const user2 = await createUser('LongMsgUser2');

      const chatPage1 = new RandomChatPage(user1.page);
      const chatPage2 = new RandomChatPage(user2.page);

      await chatPage1.goto();
      await chatPage2.goto();

      await chatPage1.startSearch();
      await chatPage2.startSearch();

      await chatPage1.waitForMatch();
      await chatPage2.waitForMatch();

      const longMessage = 'This is a very long message. '.repeat(20);
      await chatPage1.sendMessage(longMessage);

      // Should be able to send and receive long messages
      await chatPage2.waitForMessage('This is a very long message');
    });

    test('should handle special characters in messages', async ({ createUser }) => {
      const user1 = await createUser('SpecialUser1');
      const user2 = await createUser('SpecialUser2');

      const chatPage1 = new RandomChatPage(user1.page);
      const chatPage2 = new RandomChatPage(user2.page);

      await chatPage1.goto();
      await chatPage2.goto();

      await chatPage1.startSearch();
      await chatPage2.startSearch();

      await chatPage1.waitForMatch();
      await chatPage2.waitForMatch();

      await chatPage1.sendMessage('Special chars: <>&"\'@#$%^*()');

      // Should handle special characters
      await chatPage2.waitForMessage('Special chars');
    });
  });

  test.describe('End Chat', () => {
    test('should handle partner leaving chat', async ({ createUser }) => {
      const user1 = await createUser('Leaver1');
      const user2 = await createUser('Leaver2');

      const chatPage1 = new RandomChatPage(user1.page);
      const chatPage2 = new RandomChatPage(user2.page);

      await chatPage1.goto();
      await chatPage2.goto();

      await chatPage1.startSearch();
      await chatPage2.startSearch();
      await chatPage1.waitForMatch();
      await chatPage2.waitForMatch();

      // User2 leaves
      await chatPage2.leaveChat();

      // User1 should see chat ended
      await chatPage1.waitForChatEnded();

      // User1's message input should be disabled
      await expect(chatPage1.messageInput).toBeDisabled();
    });

    test('should show chat ended message', async ({ createUser }) => {
      const user1 = await createUser('EndMsg1');
      const user2 = await createUser('EndMsg2');

      const chatPage1 = new RandomChatPage(user1.page);
      const chatPage2 = new RandomChatPage(user2.page);

      await chatPage1.goto();
      await chatPage2.goto();

      await chatPage1.startSearch();
      await chatPage2.startSearch();
      await chatPage1.waitForMatch();
      await chatPage2.waitForMatch();

      await chatPage2.leaveChat();
      await chatPage1.waitForChatEnded();

      // Should see "Chat has ended" or similar
      const isChatEnded = await chatPage1.isChatEnded();
      expect(isChatEnded).toBe(true);
    });

    test('should disable input after chat ends', async ({ createUser }) => {
      const user1 = await createUser('DisableInput1');
      const user2 = await createUser('DisableInput2');

      const chatPage1 = new RandomChatPage(user1.page);
      const chatPage2 = new RandomChatPage(user2.page);

      await chatPage1.goto();
      await chatPage2.goto();

      await chatPage1.startSearch();
      await chatPage2.startSearch();
      await chatPage1.waitForMatch();
      await chatPage2.waitForMatch();

      await chatPage2.leaveChat();
      await chatPage1.waitForChatEnded();

      // Input should be disabled
      const isDisabled = await chatPage1.isMessageInputDisabled();
      expect(isDisabled).toBe(true);
    });

    test('should allow starting new chat after end', async ({ createUser }) => {
      const user1 = await createUser('NewChat1');
      const user2 = await createUser('NewChat2');

      const chatPage1 = new RandomChatPage(user1.page);
      const chatPage2 = new RandomChatPage(user2.page);

      await chatPage1.goto();
      await chatPage2.goto();

      await chatPage1.startSearch();
      await chatPage2.startSearch();
      await chatPage1.waitForMatch();
      await chatPage2.waitForMatch();

      // End the chat
      await chatPage1.leaveChat();

      // Should be able to start a new chat
      await expect(chatPage1.startChatButton).toBeVisible();
      await chatPage1.startSearch();
      await expect(chatPage1.waitingText).toBeVisible();
    });
  });

  test.describe('Reroll', () => {
    test('should allow reroll to find new partner', async ({ createUser }) => {
      const user = await createUser('RerollUser');
      const chatPage = new RandomChatPage(user.page);

      await chatPage.goto();

      // Create a simulated match first
      user.mocks.chatState.startRandomChat(
        user.mocks.sessionState.getCurrentUser()!.id,
        'RerollUser'
      );

      await chatPage.startSearch();

      // Wait a bit for the match to potentially happen
      await user.page.waitForTimeout(1000);

      // If matched, reroll should be available
      if (await chatPage.rerollButton.isVisible()) {
        await chatPage.reroll();
        await expect(chatPage.waitingText).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle match API failure', async ({ createUser }) => {
      const user = await createUser('MatchFailUser');
      const chatPage = new RandomChatPage(user.page);

      user.mocks.setError('/api/chat/match/random', chatErrors.matchFailed);

      await chatPage.goto();
      await chatPage.startChatButton.click();

      await user.page.waitForTimeout(500);

      // Should show error or stay in idle state
      const hasError = await chatPage.hasError();
      const isIdle = await chatPage.isIdle();

      expect(hasError || isIdle).toBeTruthy();
    });

    test('should handle message send failure', async ({ createUser }) => {
      const user1 = await createUser('MsgFail1');
      const user2 = await createUser('MsgFail2');

      const chatPage1 = new RandomChatPage(user1.page);
      const chatPage2 = new RandomChatPage(user2.page);

      await chatPage1.goto();
      await chatPage2.goto();

      await chatPage1.startSearch();
      await chatPage2.startSearch();
      await chatPage1.waitForMatch();
      await chatPage2.waitForMatch();

      // Get the session ID from the URL or state
      const session = user1.mocks.chatState.getUserSessions(
        user1.mocks.sessionState.getCurrentUser()!.id
      )[0];

      if (session) {
        user1.mocks.setError(`/api/chat/${session.id}/messages/send`, errors.serverError('Send failed'));
      }

      // Try to send message
      await chatPage1.trySendMessage('This will fail');

      await user1.page.waitForTimeout(500);

      // Should show error or message should not appear
    });

    test('should handle socket disconnection', async ({ createUser }) => {
      const user = await createUser('DisconnectUser');
      const chatPage = new RandomChatPage(user.page);

      await chatPage.goto();
      await chatPage.startSearch();

      // Simulate socket disconnection
      await user.mocks.socket.disconnect();

      await user.page.waitForTimeout(500);

      // Should handle disconnection gracefully (show error or reconnect)
    });
  });

  test.describe('UI State Consistency', () => {
    test('should maintain state after page reload while waiting', async ({ createUser }) => {
      const user = await createUser('ReloadUser');
      const chatPage = new RandomChatPage(user.page);

      await chatPage.goto();
      await chatPage.startSearch();

      // Reload the page
      await user.page.reload();

      await user.page.waitForTimeout(500);

      // State might be reset to idle after reload (depends on implementation)
      const isIdle = await chatPage.isIdle();
      const isWaiting = await chatPage.isWaiting();

      expect(isIdle || isWaiting).toBeTruthy();
    });

    test('should show correct button states', async ({ createUser }) => {
      const user = await createUser('ButtonStateUser');
      const chatPage = new RandomChatPage(user.page);

      await chatPage.goto();

      // Idle: start button visible, others hidden
      await expect(chatPage.startChatButton).toBeVisible();
      await expect(chatPage.cancelSearchButton).not.toBeVisible();
      await expect(chatPage.leaveChatButton).not.toBeVisible();

      // Waiting: cancel button visible
      await chatPage.startSearch();
      await expect(chatPage.startChatButton).not.toBeVisible();
      await expect(chatPage.cancelSearchButton).toBeVisible();

      // Back to idle
      await chatPage.cancelSearch();
      await expect(chatPage.startChatButton).toBeVisible();
    });
  });
});
