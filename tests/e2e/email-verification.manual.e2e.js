import { test, expect } from '@playwright/test';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

// 2026-10-28: a MANUAL check of passenger email verification with a real inbox. Run only on purpose
// (E2E_MANUAL=1, headed). It signs up a new passenger and stops on "Verify your email"; the person running it types
// the code from their email into the browser window. The test then checks the passenger is signed in.

const SHOTS = path.resolve('playwright-report/email-verification');

test.skip(!process.env.E2E_MANUAL, 'Manual check: set E2E_MANUAL=1 and run headed.');
test.setTimeout(15 * 60 * 1000);

test('a new passenger verifies their email with the emailed code', async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });
  const stamp = Date.now().toString(36);

  await page.goto('/passenger/signup');
  await page.locator('#signup-firstName').fill('Verify');
  await page.locator('#signup-lastName').fill('Check');
  await page.locator('#signup-email').fill(`Verify.Check.${stamp}@Example.com`); // capitals on purpose
  await page.locator('#signup-phone').fill('9170000072');
  await page.locator('#signup-dob').fill('2000-04-04');
  await page.locator('#signup-gender').selectOption('prefer_not_to_say');
  await page.locator('#signup-address').fill('Davao City');
  await page.locator('#signup-next-btn').click();
  await page.locator('#signup-password').fill('Password123');
  await page.locator('#signup-confirm').fill('Password123');
  await page.locator('#signup-terms').check();
  await page.locator('#signup-submit-btn').click();

  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible({ timeout: 60000 });
  await page.screenshot({ path: path.join(SHOTS, '1-verify-your-email.png'), fullPage: true });

  // Now type the 6-digit code from the email into the window. Waits up to 10 minutes.
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10 * 60 * 1000 });

  await page.goto('/passenger/dashboard?tab=profile');
  await expect(page.getByTestId('field-gender')).toContainText('Prefer not to say', { timeout: 60000 });
  await page.screenshot({ path: path.join(SHOTS, '2-signed-in-profile.png'), fullPage: true });
});
