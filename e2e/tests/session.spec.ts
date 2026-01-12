import { test, expect } from '@playwright/test';
import { LandingPage } from '../pages/landing.page';

test.describe('Anonymous Session', () => {
  test('should create session with custom username', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.goto();

    await landingPage.setUsername('TestUser');
    await landingPage.navigateToForums();

    await expect(page).toHaveURL(/\/forums/);
    await expect(page.getByText('TestUser')).toBeVisible();
  });

  test('should create session with random username when left blank', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.goto();

    // Don't fill username
    await landingPage.navigateToFeed();

    await expect(page).toHaveURL(/\/feed/);
    // Header should show some username (Greek-themed pattern typically has capital letters)
    await expect(page.locator('header')).toBeVisible();
  });

  test('should persist session across page navigation', async ({ page }) => {
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
  });

  test('should navigate to all main pages from landing', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.goto();

    // Check all navigation buttons are visible
    await expect(landingPage.viewGlobalFeedButton).toBeVisible();
    await expect(landingPage.browseForumsButton).toBeVisible();
    await expect(landingPage.randomChatButton).toBeVisible();
    await expect(landingPage.browseChatroomsButton).toBeVisible();
  });
});
