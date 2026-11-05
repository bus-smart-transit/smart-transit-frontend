import { test, expect } from '@playwright/test';

// 2026-11-05: a Driver or Chauffeur signs in on the staff page with their username (demo usernames are the part of
// the email before the @), and finds that username on their profile. An Operator's username is refused.
const PASSWORD = process.env.E2E_PASSWORD || 'password123';

async function signIn(page, identifier) {
  await page.goto('/employee/login');
  await page.getByRole('textbox', { name: /Email or username/ }).fill(identifier);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

for (const { username, url, profile } of [
  { username: 'driver4', url: /driver\/dashboard/, profile: '/employee/driver/dashboard?tab=account' },
  { username: 'conductor4', url: /conductor\/dashboard/, profile: '/employee/conductor/dashboard?tab=account' },
]) {
  test(`${username} signs in with the username and sees it on the profile`, async ({ page }) => {
    await signIn(page, username.toUpperCase());
    await page.waitForURL(url, { timeout: 60000 });
    await page.goto(profile);
    await expect(page.getByTestId('field-username')).toContainText(username);
  });
}

test('an Operator cannot sign in with a username', async ({ page }) => {
  await signIn(page, 'operator');
  await expect(page.getByText('Invalid email or password credentials provided.')).toBeVisible({ timeout: 30000 });
  await expect(page).toHaveURL(/employee\/login/);
});
