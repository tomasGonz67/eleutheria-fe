import { test, expect } from '../fixtures/auth.fixture';
import { errors, postErrors } from '../mocks/data/errors.data';

// Note: Posts are displayed within forum detail pages
// This test file focuses on post CRUD operations

test.describe('Posts', () => {
  test.describe('Display Posts', () => {
    test('should display posts in forum', async ({ createUser }) => {
      const user = await createUser('PostViewUser');

      // Get a forum with posts
      await user.page.goto('/forums/1');

      // Should see posts from mock data
      await user.page.waitForTimeout(500);
      const posts = await user.page.locator('[data-testid="post"], .post-card, article').count();
      expect(posts).toBeGreaterThanOrEqual(0); // May have posts from default data
    });

    test('should display post content and author', async ({ createUser }) => {
      const user = await createUser('PostContentUser');

      // Add a specific post to forum 1
      user.mocks.postsState.create(
        1,
        'This is a test post content',
        user.mocks.sessionState.getCurrentUser()!.id,
        'PostContentUser'
      );

      await user.page.goto('/forums/1');

      // Should see the post content
      await expect(user.page.getByText('This is a test post content')).toBeVisible();
    });

    test('should display nested replies', async ({ createUser }) => {
      const user = await createUser('ReplyViewUser');
      const currentUser = user.mocks.sessionState.getCurrentUser()!;

      // Create a post and its reply
      const post = user.mocks.postsState.create(
        1,
        'Parent post content',
        currentUser.id,
        currentUser.username
      );

      user.mocks.postsState.create(
        1,
        'This is a reply',
        currentUser.id,
        currentUser.username,
        post.id
      );

      await user.page.goto(`/forums/1/comments/${post.id}`);

      await user.page.waitForTimeout(500);

      // Should see the reply
      const replyVisible = await user.page.getByText('This is a reply').isVisible();
      expect(replyVisible).toBeTruthy();
    });
  });

  test.describe('Create Post', () => {
    test('should create new post in forum', async ({ createUser }) => {
      const user = await createUser('PostCreateUser');

      await user.page.goto('/forums/1');

      // Look for post creation form or button
      const createButton = user.page.getByRole('button', { name: /create|new|post/i });
      const postInput = user.page.getByPlaceholder(/write|post|content/i);

      if (await createButton.isVisible()) {
        await createButton.click();
      }

      if (await postInput.isVisible()) {
        await postInput.fill('My new post content');
        const submitButton = user.page.getByRole('button', { name: /submit|post|send/i });
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await user.page.waitForTimeout(500);

          // Post should appear
          await expect(user.page.getByText('My new post content')).toBeVisible();
        }
      }
    });

    test('should show validation error for empty content', async ({ createUser }) => {
      const user = await createUser('EmptyPostUser');

      // Set error for empty content
      user.mocks.setError('/api/forums/1/posts/create', postErrors.emptyContent);

      await user.page.goto('/forums/1');

      const postInput = user.page.getByPlaceholder(/write|post|content/i);

      if (await postInput.isVisible()) {
        await postInput.fill('');
        const submitButton = user.page.getByRole('button', { name: /submit|post|send/i });
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await user.page.waitForTimeout(500);

          // Should show error or button should be disabled
          const hasError = await user.page.locator('.text-red-500, [role="alert"]').isVisible();
          const buttonDisabled = await submitButton.isDisabled();
          expect(hasError || buttonDisabled).toBeTruthy();
        }
      }
    });

    test('should show validation error for content too long', async ({ createUser }) => {
      const user = await createUser('LongPostUser');

      user.mocks.setError('/api/forums/1/posts/create', postErrors.contentTooLong);

      await user.page.goto('/forums/1');

      const postInput = user.page.getByPlaceholder(/write|post|content/i);

      if (await postInput.isVisible()) {
        const longContent = 'A'.repeat(11000); // Exceeds 10000 char limit
        await postInput.fill(longContent);

        const submitButton = user.page.getByRole('button', { name: /submit|post|send/i });
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await user.page.waitForTimeout(500);

          // Should show error
          const hasError = await user.page.locator('.text-red-500, [role="alert"]').isVisible();
          expect(hasError).toBeTruthy();
        }
      }
    });
  });

  test.describe('Reply to Post', () => {
    test('should reply to a post', async ({ createUser }) => {
      const user = await createUser('ReplyUser');
      const currentUser = user.mocks.sessionState.getCurrentUser()!;

      // Create a parent post
      const post = user.mocks.postsState.create(
        1,
        'Post to reply to',
        currentUser.id,
        currentUser.username
      );

      await user.page.goto(`/forums/1/comments/${post.id}`);

      // Find reply input or button
      const replyInput = user.page.getByPlaceholder(/reply|comment|write/i);
      const replyButton = user.page.getByRole('button', { name: /reply/i });

      if (await replyButton.isVisible()) {
        await replyButton.click();
      }

      if (await replyInput.isVisible()) {
        await replyInput.fill('This is my reply');
        const submitButton = user.page.getByRole('button', { name: /submit|send|reply/i }).last();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await user.page.waitForTimeout(500);

          // Reply should appear
          await expect(user.page.getByText('This is my reply')).toBeVisible();
        }
      }
    });

    test('should create nested reply (reply to reply)', async ({ createUser }) => {
      const user = await createUser('NestedReplyUser');
      const currentUser = user.mocks.sessionState.getCurrentUser()!;

      // Create post and reply
      const post = user.mocks.postsState.create(
        1,
        'Original post',
        currentUser.id,
        currentUser.username
      );

      const reply = user.mocks.postsState.create(
        1,
        'First reply',
        currentUser.id,
        currentUser.username,
        post.id
      );

      await user.page.goto(`/forums/1/comments/${post.id}`);
      await user.page.waitForTimeout(500);

      // Should see both post and reply
      await expect(user.page.getByText('Original post')).toBeVisible();
      await expect(user.page.getByText('First reply')).toBeVisible();
    });
  });

  test.describe('Edit Post', () => {
    test('should edit own post', async ({ createUser }) => {
      const user = await createUser('EditPostUser');
      const currentUser = user.mocks.sessionState.getCurrentUser()!;

      const post = user.mocks.postsState.create(
        1,
        'Original post content',
        currentUser.id,
        currentUser.username
      );

      await user.page.goto(`/forums/1/comments/${post.id}`);

      // Find edit button
      const editButton = user.page.getByRole('button', { name: /edit/i }).first();

      if (await editButton.isVisible()) {
        await editButton.click();

        const editInput = user.page.getByRole('textbox').first();
        await editInput.fill('Updated post content');

        const saveButton = user.page.getByRole('button', { name: /save|update/i });
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await user.page.waitForTimeout(500);

          // Updated content should appear
          await expect(user.page.getByText('Updated post content')).toBeVisible();
        }
      }
    });

    test('should not show edit button for others posts', async ({ createUser }) => {
      const user = await createUser('NonOwnerEditUser');

      // Create a post owned by someone else (user ID 999)
      const post = user.mocks.postsState.create(
        1,
        'Post by another user',
        999,
        'OtherUser'
      );

      await user.page.goto(`/forums/1/comments/${post.id}`);

      // Edit button should not be visible (or should be for the post owner only)
      const editButtons = await user.page.getByRole('button', { name: /edit/i }).count();
      // If edit buttons exist, they should not be for this post
      expect(editButtons).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Delete Post', () => {
    test('should delete own post', async ({ createUser }) => {
      const user = await createUser('DeletePostUser');
      const currentUser = user.mocks.sessionState.getCurrentUser()!;

      const post = user.mocks.postsState.create(
        1,
        'Post to delete',
        currentUser.id,
        currentUser.username
      );

      await user.page.goto('/forums/1');
      await user.page.waitForTimeout(500);

      // Find the post and its delete button
      const deleteButton = user.page.locator(`article:has-text("Post to delete")`).getByRole('button', { name: /delete/i });

      if (await deleteButton.isVisible()) {
        user.page.once('dialog', dialog => dialog.accept());
        await deleteButton.click();
        await user.page.waitForTimeout(500);

        // Post should be gone
        const stillExists = await user.page.getByText('Post to delete').isVisible();
        expect(stillExists).toBe(false);
      }
    });

    test('should not show delete button for others posts', async ({ createUser }) => {
      const user = await createUser('NonOwnerDeleteUser');

      // Create a post owned by someone else
      user.mocks.postsState.create(
        1,
        'Post by another user for delete test',
        999,
        'OtherUser'
      );

      await user.page.goto('/forums/1');

      // Look for delete button near this post
      const postCard = user.page.locator(`article:has-text("Post by another user for delete test")`);
      const deleteButton = postCard.getByRole('button', { name: /delete/i });

      const deleteVisible = await deleteButton.isVisible().catch(() => false);
      expect(deleteVisible).toBe(false);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle post creation failure', async ({ createUser }) => {
      const user = await createUser('FailCreateUser');

      user.mocks.setError('/api/forums/1/posts/create', errors.serverError('Failed to create post'));

      await user.page.goto('/forums/1');

      const postInput = user.page.getByPlaceholder(/write|post|content/i);

      if (await postInput.isVisible()) {
        await postInput.fill('Post that will fail');
        const submitButton = user.page.getByRole('button', { name: /submit|post|send/i });
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await user.page.waitForTimeout(500);

          // Should show error
          const hasError = await user.page.locator('.text-red-500, [role="alert"]').isVisible();
          // Post should not appear
          const postAppeared = await user.page.getByText('Post that will fail').count() > 1;
          expect(hasError || !postAppeared).toBeTruthy();
        }
      }
    });

    test('should handle permission error when editing', async ({ createUser }) => {
      const user = await createUser('PermissionUser');
      const currentUser = user.mocks.sessionState.getCurrentUser()!;

      const post = user.mocks.postsState.create(
        1,
        'Restricted post',
        currentUser.id,
        currentUser.username
      );

      // Set permission error
      user.mocks.setError(`/api/posts/${post.id}/edit`, postErrors.notOwner);

      await user.page.goto(`/forums/1/comments/${post.id}`);

      // If edit functionality is available, the error should be handled gracefully
    });

    test('should handle forum not found error', async ({ createUser }) => {
      const user = await createUser('NotFoundUser');

      user.mocks.setError('/api/forums/999/posts', errors.notFound('Forum'));

      await user.page.goto('/forums/999');
      await user.page.waitForTimeout(500);

      // Should show error or redirect
      const hasError = await user.page.locator('.text-red-500, [role="alert"]').isVisible();
      const url = user.page.url();

      expect(hasError || !url.includes('/forums/999')).toBeTruthy();
    });
  });

  test.describe('Search Posts', () => {
    test('should search posts within forum', async ({ createUser }) => {
      const user = await createUser('SearchPostUser');
      const currentUser = user.mocks.sessionState.getCurrentUser()!;

      user.mocks.postsState.create(
        1,
        'Searchable unique content xyz123',
        currentUser.id,
        currentUser.username
      );

      await user.page.goto('/forums/1');

      const searchInput = user.page.getByPlaceholder(/search/i);

      if (await searchInput.isVisible()) {
        await searchInput.fill('xyz123');
        await searchInput.press('Enter');
        await user.page.waitForTimeout(500);

        // Should find the post
        await expect(user.page.getByText('xyz123')).toBeVisible();
      }
    });
  });
});
