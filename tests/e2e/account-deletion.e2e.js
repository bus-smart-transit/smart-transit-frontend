import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// 2026-11-05: a passenger deletes their own account from the profile, sees when the data will be erased, and keeps
// the account by signing in again. Needs the local Docker backend: the throwaway passenger is created there with
// tinker (verified email, extra login code off), the way trip-day.e2e.js runs its simulator. Set E2E_COMPOSE_DIR
// when the compose files are not in the folder above the frontend.
const COMPOSE_DIR = process.env.E2E_COMPOSE_DIR || path.resolve('..');
const SHOTS = path.resolve('playwright-report/account-deletion');
const PASSWORD = 'password123';
const stamp = Date.now();
const EMAIL = `e2e.delete.${stamp}@example.com`;

test.beforeAll(() => {
  mkdirSync(SHOTS, { recursive: true });
  const php = `$u = App\\Models\\User::create(["username" => "e2edel${stamp}", "email" => "${EMAIL}", "password" => "${PASSWORD}", "role" => "passenger"]);`
    + ' $u->forceFill(["email_verified_at" => now()])->save();'
    + ' App\\Models\\PassengerUser::create(["passenger_uuid" => (string) Illuminate\\Support\\Str::uuid(), "user_id" => $u->user_id, "name" => "E2E Delete Me", "phone_num" => "09170000078", "address" => "Panabo City", "birthdate" => "1999-01-01"]);'
    + ' echo "ok";';
  const result = spawnSync('docker', ['compose', 'exec', '-T', 'backend', 'php', 'artisan', 'tinker', '--execute', php], { cwd: COMPOSE_DIR, encoding: 'utf8' });
  if (!String(result.stdout).includes('ok')) throw new Error(`Could not create the test passenger: ${result.stderr || result.stdout}`);
});

async function passengerSignIn(page) {
  await page.goto('/passenger/login');
  await page.getByRole('textbox', { name: /Email/ }).fill(EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  // A passenger lands on the home page (or the page they came from) after signing in.
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 });
}

test('a passenger deletes their own account, then keeps it by signing in again', async ({ page }) => {
  await passengerSignIn(page);
  await page.goto('/passenger/dashboard?tab=profile');

  const section = page.getByTestId('delete-account');
  await expect(section).toBeVisible();
  await section.getByRole('button', { name: 'Delete my account' }).click();
  await section.getByLabel('Enter your password').fill(PASSWORD);
  await section.getByRole('checkbox').check();
  await page.screenshot({ path: path.join(SHOTS, '1-confirm.png'), fullPage: true });
  await section.getByRole('button', { name: 'Delete my account' }).click();

  await page.waitForURL((url) => url.pathname === '/', { timeout: 30000 });
  await expect(page.getByTestId('account-deletion-notice')).toContainText(/Your account will be deleted on \d{4}-\d{2}-\d{2}/);
  await page.screenshot({ path: path.join(SHOTS, '2-notice.png') });

  // The old session is gone on the server too: the dashboard asks to sign in again.
  await page.goto('/passenger/dashboard?tab=profile');
  await expect(page.getByTestId('delete-account')).toHaveCount(0);

  await passengerSignIn(page);
  await expect(page.getByTestId('account-deletion-cancelled')).toHaveText('Welcome back. Your account will not be deleted.');
  await page.screenshot({ path: path.join(SHOTS, '3-cancelled.png') });
});
