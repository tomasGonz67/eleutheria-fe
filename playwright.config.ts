import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Enable parallel execution - tests no longer depend on shared backend state
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Increase workers for faster parallel execution
  workers: process.env.CI ? 2 : 4,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  // Reduced timeout since we're using mocks (no real API latency)
  timeout: 30000,

  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Only frontend server needed - backend is mocked
  webServer: {
    command: 'npm run dev -- -p 3001',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
