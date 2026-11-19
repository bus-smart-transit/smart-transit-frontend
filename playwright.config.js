import { defineConfig } from '@playwright/test';

// End-to-end checks and baseline screenshots (npm run e2e). The app and the backend must already be running:
// the frontend on E2E_BASE_URL (default http://localhost:5173) talking to the local backend. Vitest does not pick these
// files up: they end in .e2e.js. The installed Microsoft Edge is used, so no browser download is needed.
// Watching in a VS Code tab (Ctrl+Shift+P > "Simple Browser: Show"):
//   npm run e2e:ui      live runner with step-by-step snapshots on http://127.0.0.1:9330
//   npm run e2e:report  last run's report with traces on http://127.0.0.1:9323 (in playwright-report/html, so the
//                       screenshots tests save in playwright-report/<name> are not wiped by the report)
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.e2e.js',
  timeout: 180000,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/html' }]],
  use: {
    trace: 'on',
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    channel: 'msedge',
    headless: true,
    timezoneId: 'Asia/Manila',
    locale: 'en-PH',
  },
});
