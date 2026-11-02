import { defineConfig, devices } from '@playwright/test';

const webPort = Number(process.env.WEB_PORT ?? 5101);
const apiPort = Number(process.env.API_PORT ?? 5102);
const ports = { WEB_PORT: String(webPort), API_PORT: String(apiPort) };

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${webPort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', testIgnore: /categories\.spec\.ts$/, use: { ...devices['Desktop Chrome'] } },
    // Adding, renaming and retiring categories changes the shared category list that the other tests rely on
    // (the six default categories), so these tests run after all others.
    {
      name: 'categories',
      testMatch: /categories\.spec\.ts$/,
      dependencies: ['chromium'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // API on a fresh in-memory database with the sample data.
      command: 'npm run start --workspace server',
      url: `http://localhost:${apiPort}/api/v1/categories`,
      env: { ...ports, DB_PATH: ':memory:' },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run dev --workspace web',
      url: `http://localhost:${webPort}`,
      env: ports,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
