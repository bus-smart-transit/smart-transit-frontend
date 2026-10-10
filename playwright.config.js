import { defineConfig } from '@playwright/test';

// End-to-end checks and baseline screenshots (npm run e2e). The app and the backend must already be running:
// the frontend on E2E_BASE_URL (default http://localhost:5173) talking to the local backend. Vitest does not pick these
// files up: they end in .e2e.js. The installed Microsoft Edge is used, so no browser download is needed.
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.e2e.js',
  timeout: 180000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    channel: 'msedge',
    headless: true,
    timezoneId: 'Asia/Manila',
    locale: 'en-PH',
  },
});
