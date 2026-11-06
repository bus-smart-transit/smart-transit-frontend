import { test, expect } from '@playwright/test';
import path from 'node:path';

// Batch 48 Phase 2: the Super Admin signs in to their own portal (Dashboard counts across every company, the
// needs-attention list, "Older tools" for the earlier panel). An Operator who opens the Super Admin address does not
// get it. Changes nothing.
const PASSWORD = process.env.E2E_PASSWORD || 'password123';
const SHOTS = path.resolve('test-results/super-admin');

async function signIn(page, email, landing) {
  await page.goto('/employee/login');
  await page.getByRole('textbox', { name: /Email or username/ }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(landing, { timeout: 60000 });
}

for (const width of [1280, 390]) {
  test(`Super Admin Dashboard at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const problems = [];
    page.on('pageerror', (error) => problems.push(String(error).slice(0, 200)));

    await signIn(page, 'admin@smarttransit.com', /admin\/dashboard/);
    const counts = page.getByRole('region', { name: 'Platform counts' });
    await expect(counts.getByText('Companies')).toBeVisible({ timeout: 30000 });
    await expect(counts.getByText('Tickets paid today')).toBeVisible();
    await expect(page.getByText('Needs attention')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: path.join(SHOTS, `dashboard_${width}.png`), fullPage: true });

    if (width === 390) {
      await page.getByRole('button', { name: 'Open navigation' }).click();
    }
    await page.getByRole('button', { name: 'Older tools' }).click();
    await page.waitForURL(/admin\/tools/);
    expect(problems).toEqual([]);
  });
}

test('an Operator cannot open the Super Admin portal', async ({ page }) => {
  await signIn(page, 'operator@smarttransit.com', /operator\/dashboard/);
  await page.goto('/employee/admin/dashboard');
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.getByRole('region', { name: 'Platform counts' })).toHaveCount(0);
  expect(page.url()).not.toMatch(/admin\/dashboard/);
});
