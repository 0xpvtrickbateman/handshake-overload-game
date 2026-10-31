import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: process.env.PLAYWRIGHT_BASE_URL ? 360000 : 120000,
  expect: { timeout: process.env.PLAYWRIGHT_BASE_URL ? 20000 : 8000 },
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100',
    actionTimeout: 8000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'OVERLOAD_TEST_MODE=1 npm run start -- --port 3100',
        url: 'http://127.0.0.1:3100',
        reuseExistingServer: false,
        timeout: 120000,
      },
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
});
