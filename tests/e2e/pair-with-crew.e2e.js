import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// Batch 45 Feature B: the Daily PIN tab is gone from the menu; the Dashboard's "Pair with crew" card opens a pop-up
// with the same pairing and Daily PIN content, for the Driver and the Chauffeur, at desktop and phone width.
const SHOTS = path.resolve('playwright-report/pair-with-crew');
const PASSWORD = process.env.E2E_PASSWORD || 'password123';

test.beforeAll(() => mkdirSync(SHOTS, { recursive: true }));

async function staffSignIn(page, email, urlPart) {
  await page.goto('/employee/login');
  await page.getByRole('textbox', { name: /Email/ }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(urlPart, { timeout: 60000 });
}

for (const { role, email, url, home } of [
  { role: 'driver', email: 'driver4@smarttransit.com', url: /driver\/dashboard/, home: '/employee/driver/dashboard?tab=dashboard' },
  { role: 'chauffeur', email: 'conductor4@smarttransit.com', url: /conductor\/dashboard/, home: '/employee/conductor/dashboard?tab=dashboard' },
]) {
  for (const width of [1280, 390]) {
    test(`${role}: the Dashboard card opens the "Pair with crew" pop-up (${width} px)`, async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', (err) => pageErrors.push(String(err?.message || err)));
      await page.setViewportSize({ width, height: 900 });
      await staffSignIn(page, email, url);
      await page.goto(home);

      await expect(page.locator('aside nav button', { hasText: /^Daily PIN$/ })).toHaveCount(0);
      // Batch 61: Home's one big next-step button is "Pair with crew" until the crew are paired.
      const card = page.getByTestId('crew-next-step');
      await expect(card).toBeVisible({ timeout: 30000 });
      await page.screenshot({ path: path.join(SHOTS, `${role}-${width}-1-card.png`) });

      await card.getByRole('button', { name: /Pair with crew/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Pair with crew' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByTestId('pair-with-crew-modal')).toBeVisible();
      await page.waitForTimeout(600); // let the pop-up finish fading in before the screenshot
      await page.screenshot({ path: path.join(SHOTS, `${role}-${width}-2-modal.png`) });

      await dialog.getByRole('button', { name: 'Close' }).click();
      await expect(dialog).toHaveCount(0);
      expect(pageErrors).toEqual([]);
    });
  }
}
