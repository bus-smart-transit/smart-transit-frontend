import { test, expect } from '@playwright/test';
import path from 'node:path';

// 2026-11-06 (user's permission table): the demo Company Admin adds an Operator to their company, turns the account
// off (someone resigned) and on again. Their own row cannot be changed here. The new Operator stays in the local
// database (accounts are never deleted); a fresh reseed removes it.
const PASSWORD = process.env.E2E_PASSWORD || 'password123';
const SHOTS = path.resolve('test-results/operator-accounts');

async function signInCompanyAdmin(page) {
  await page.goto('/employee/login');
  await page.getByRole('textbox', { name: /Email or username/ }).fill('operator@smarttransit.com');
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/operator\/dashboard/, { timeout: 60000 });
}

for (const width of [1280, 390]) {
  test(`a Company Admin adds an Operator and turns the account off and on at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await signInCompanyAdmin(page);
    await page.goto('/employee/operator/dashboard?tab=staffs');
    const table = page.getByRole('table', { name: 'Staff Directory' });
    await expect(table).toBeVisible({ timeout: 60000 });

    const stamp = `${width}${Date.now() % 100000}`;
    const username = `dispatch${stamp}`;
    await page.getByRole('button', { name: 'Add Staff' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add Staff' });
    await dialog.locator('#staff-role').selectOption('operator');
    await expect(dialog.getByText(/Only the Super Admin can make someone a Company Admin/)).toBeVisible();
    await dialog.getByLabel('First Name').fill('Dina');
    await dialog.getByLabel('Last Name').fill(`Dispatch ${stamp}`);
    // Batch 60 item 3: an Operator has no username (they sign in with the email).
    await expect(dialog.getByLabel('Username (for signing in)')).toHaveCount(0);
    await dialog.getByLabel('Email Address').fill(`${username}@example.com`);
    await dialog.getByLabel('Phone: number').fill('9171234599');
    await dialog.getByLabel('Birth Date').fill('1995-05-05');
    await dialog.locator('#staff-address').fill('Sample City');
    await dialog.locator('#staff-password').fill('Strong-Pass-123');
    await dialog.locator('#staff-confirm').fill('Strong-Pass-123');
    await page.screenshot({ path: path.join(SHOTS, `add-operator_${width}.png`), fullPage: false });
    await dialog.getByRole('button', { name: 'Add Staff' }).click();
    await expect(page.getByText('Staff account created.', { exact: false })).toBeVisible({ timeout: 30000 });

    await page.getByLabel('Role', { exact: true }).selectOption('operator');
    const row = table.getByRole('row').filter({ hasText: username });
    await expect(row.getByText('Operator', { exact: true })).toBeVisible({ timeout: 30000 });
    await expect(table.getByRole('row').filter({ hasText: 'You' }).getByRole('button')).toHaveCount(0);
    await page.screenshot({ path: path.join(SHOTS, `operators_${width}.png`), fullPage: true });

    await row.getByRole('button', { name: /Turn off/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Turn off/ }).click();
    await expect(row.getByText('Turned off')).toBeVisible({ timeout: 30000 });
    await row.getByRole('button', { name: /Turn on/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Turn on/ }).click();
    await expect(row.getByText('Active')).toBeVisible({ timeout: 30000 });
  });
}
