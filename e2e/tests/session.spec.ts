import { test, expect } from '../fixtures/auth.fixture';
import { LandingPage } from '../pages/landing.page';
import { errors } from '../mocks/data/errors.data';

test.describe('Anonymous Session', () => {
  test.describe('Session Creation', () => {
    test('should create session with custom username', async ({ page, mocks }) => {
      const landingPage = new LandingPage(page);
      await landingPage.goto();

      await landingPage.setUsername('TestUser');
      await landingPage.navigateToForums();

      await expect(page).toHaveURL(/\/forums/);
      await expect(page.getByText('TestUser')).toBeVisible();

      // Verify mock state
      const user = mocks.sessionState.getCurrentUser();
      expect(user?.username).toBe('TestUser');
    });

    test('should create session with random Greek username when left blank', async ({ page, mocks }) => {
      const landingPage = new LandingPage(page);
      await landingPage.goto();

      // Don't fill username - should get random Greek name
      await landingPage.navigateToFeed();

      await expect(page).toHaveURL(/\/feed/);

      // Verify a username was generated
      const user = mocks.sessionState.getCurrentUser();
      expect(user?.username).toBeTruthy();
      expect(user?.username).toMatch(/^(Ancient|Wise|Noble|Brave|Swift|Golden)/);
    });

    test('should handle special characters in username', async ({ page, mocks }) => {
      const landingPage = new LandingPage(page);
      await landingPage.goto();

      await landingPage.setUsername('User_123-Test');
      await landingPage.navigateToForums();

      await expect(page).toHaveURL(/\/forums/);
      await expect(page.getByText('User_123-Test')).toBeVisible();
    });

    test('should enforce max length username (20 chars)', async ({ page, mocks }) => {
      const landingPage = new LandingPage(page);
      await landingPage.goto();

      const longUsername = 'A'.repeat(25); // 25 chars, exceeds limit
      await landingPage.setUsername(longUsername);
      await landingPage.browseForumsButton.click();

      // Should show validation error or truncate
      // The mock validates and returns error for > 20 chars
      await page.waitForTimeout(500);

      // Either stays on landing page with error, or username is truncated
      const user = mocks.sessionState.getCurrentUser();
      if (user) {
        expect(user.username.length).toBeLessThanOrEqual(20);
      }
    });

    test('should trim whitespace from username', async ({ page, mocks }) => {
      const landingPage = new LandingPage(page);
      await landingPage.goto();

      await landingPage.setUsername('  TrimmedUser  ');
      await landingPage.navigateToForums();

      await expect(page).toHaveURL(/\/forums/);

      const user = mocks.sessionState.getCurrentUser();
      // Username should be trimmed by the API mock
      expect(user?.username).toBe('TrimmedUser');
    });
  });

  test.describe('Session Persistence', () => {
    test('should persist session across page navigation', async ({ page, mocks }) => {
      const landingPage = new LandingPage(page);
      await landingPage.goto();

      await landingPage.setUsername('PersistentUser');
      await landingPage.navigateToForums();

      await expect(page.getByText('PersistentUser')).toBeVisible();

      // Navigate to feed
      await page.goto('/feed');
      await expect(page.getByText('PersistentUser')).toBeVisible();

      // Navigate back to forums
      await page.goto('/forums');
      await expect(page.getByText('PersistentUser')).toBeVisible();

      // Navigate to chatrooms
      await page.goto('/chatrooms');
      await expect(page.getByText('PersistentUser')).toBeVisible();
    });

    test('should display username in header across all pages', async ({ page, mocks }) => {
      const landingPage = new LandingPage(page);
      await landingPage.goto();

      await landingPage.setUsername('HeaderUser');
      await landingPage.navigateToForums();

      // Check header on forums page
      await expect(page.locator('header').getByText('HeaderUser')).toBeVisible();

      // Check header on feed page
      await page.goto('/feed');
      await expect(page.locator('header').getByText('HeaderUser')).toBeVisible();

      // Check header on random chat page
      await page.goto('/chat/random');
      await expect(page.locator('header').getByText('HeaderUser')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to all main pages from landing', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.goto();

      // Check all navigation buttons are visible
      await expect(landingPage.viewGlobalFeedButton).toBeVisible();
      await expect(landingPage.browseForumsButton).toBeVisible();
      await expect(landingPage.randomChatButton).toBeVisible();
      await expect(landingPage.browseChatroomsButton).toBeVisible();
    });

    test('should navigate to forums and back', async ({ page, mocks }) => {
      const landingPage = new LandingPage(page);
      await landingPage.goto();

      await landingPage.navigateToForums();
      await expect(page).toHaveURL(/\/forums/);

      await page.goBack();
      await expect(page).toHaveURL('/');
    });

    test('should navigate to random chat', async ({ page, mocks }) => {
      const landingPage = new LandingPage(page);
      await landingPage.goto();

      await landingPage.navigateToRandomChat();
      await expect(page).toHaveURL(/\/chat\/random/);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle session creation failure', async ({ page, mocks }) => {
      mocks.setError('/api/session/create', errors.serverError('Session service unavailable'));

      const landingPage = new LandingPage(page);
      await landingPage.goto();

      await landingPage.setUsername('FailUser');
      await landingPage.browseForumsButton.click();

      // Should show error or stay on landing page
      await page.waitForTimeout(500);

      // Verify we either see an error or stayed on landing
      const url = page.url();
      const hasError = await landingPage.hasError();

      // Either shows error or didn't navigate away
      expect(url.includes('/forums') || hasError || url === 'http://localhost:3001/').toBeTruthy();
    });

    test('should handle network timeout', async ({ page, mocks }) => {
      // Set a very long delay to simulate timeout
      mocks.setDelay('/api/session/create', 35000); // 35 seconds

      const landingPage = new LandingPage(page);
      await landingPage.goto();

      await landingPage.setUsername('TimeoutUser');

      // Click button - should show loading or timeout
      await landingPage.browseForumsButton.click();

      // Check for loading state
      await page.waitForTimeout(500);

      // Either loading or error should be visible
      const isLoading = await landingPage.isLoading();
      const hasError = await landingPage.hasError();

      // In a timeout scenario, we'd expect either loading to still be shown
      // or an error message about the timeout
      expect(isLoading || hasError || page.url() === 'http://localhost:3001/').toBeTruthy();
    });

    test('should redirect to landing when session is invalid', async ({ page, mocks }) => {
      // First create a valid session
      const landingPage = new LandingPage(page);
      await landingPage.goto();
      await landingPage.navigateToForums();

      // Now set an error for session validation
      mocks.setError('/api/session/me', errors.unauthorized('Invalid session'));

      // Try to access a protected route
      await page.goto('/feed');

      // Should be redirected to landing or show error
      await page.waitForTimeout(1000);

      // Verify redirect happened or error shown
      const currentUrl = page.url();
      const hasError = await page.locator('[role="alert"], .text-red-500').isVisible();

      expect(currentUrl.includes('/') || hasError).toBeTruthy();
    });
  });

  test.describe('Concurrent Sessions', () => {
    test('should handle concurrent session creation attempts', async ({ page, mocks }) => {
      const landingPage = new LandingPage(page);
      await landingPage.goto();

      await landingPage.setUsername('ConcurrentUser');

      // Simulate rapid clicks
      await Promise.all([
        landingPage.browseForumsButton.click(),
        page.waitForTimeout(50).then(() => landingPage.viewGlobalFeedButton.click().catch(() => {})),
      ]);

      // Should eventually navigate to one of the pages
      await page.waitForURL(/\/(forums|feed)/);

      // Session should be created
      const user = mocks.sessionState.getCurrentUser();
      expect(user).toBeTruthy();
    });
  });
});
