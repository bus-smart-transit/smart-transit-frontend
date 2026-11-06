import { test, expect } from '@playwright/test';
import path from 'node:path';

// Batch 48 Phase 2: the Super Admin signs in to their own portal (Dashboard counts across every company, the
// needs-attention list). An Operator who opens the Super Admin address does not
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

    // Batch 48 Phase 7: the earlier Admin panel and its "Older tools" link are gone.
    if (width === 390) {
      await page.getByRole('button', { name: 'Open navigation' }).click();
    }
    await expect(page.getByRole('button', { name: 'Older tools' })).toHaveCount(0);
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

// Batch 48 Phase 3: Companies and Users. Adds one company and its Company Admin to the local database (accounts are
// never deleted; a fresh reseed removes them), then turns that account off and on from Users.
for (const width of [1280, 390]) {
  test(`Super Admin adds a company and its Company Admin, then turns the account off and on, at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const openTab = async (name) => {
      if (width === 390) await page.getByRole('button', { name: 'Open navigation' }).click();
      await page.getByRole('button', { name, exact: true }).click();
    };
    page.on('dialog', (dialog) => dialog.accept());

    await signIn(page, 'admin@smarttransit.com', /admin\/dashboard/);
    await openTab('Companies');
    await expect(page.getByRole('table', { name: 'Companies' }).getByText('SmartTransit Demo Bus Co.')).toBeVisible({ timeout: 30000 });

    const stamp = `${width}${Date.now() % 100000}`;
    const companyName = `E2E Bus Co ${stamp}`;
    await page.getByRole('button', { name: 'Add company' }).first().click();
    await page.getByRole('dialog').getByLabel('Company name').fill(companyName);
    await page.getByRole('dialog').getByRole('button', { name: 'Add company' }).click();
    await expect(page.getByText('Company added. Next, add its Company Admin.')).toBeVisible({ timeout: 30000 });

    await page.getByRole('button', { name: `Add Company Admin to ${companyName}` }).click();
    const form = page.getByRole('dialog', { name: `Add Company Admin to ${companyName}` });
    const username = `owner${stamp}`;
    await form.getByLabel('First Name').fill('Olive');
    await form.getByLabel('Last Name').fill(`Owner ${stamp}`);
    await form.getByLabel('Username (for signing in)').fill(username);
    await form.getByLabel('Email Address').fill(`${username}@example.com`);
    await form.getByLabel('Phone: number').fill('9171234598');
    await form.getByLabel('Birth Date').fill('1990-01-01');
    await form.locator('#staff-address').fill('Sample City');
    await form.locator('#staff-password').fill('Strong-Pass-123');
    await form.locator('#staff-confirm').fill('Strong-Pass-123');
    await form.getByRole('button', { name: 'Add Company Admin' }).click();
    await expect(page.getByText('Company Admin added.', { exact: false })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('table', { name: 'Companies' }).getByRole('row').filter({ hasText: companyName }).getByText(`Olive Owner ${stamp}`)).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS, `companies_${width}.png`), fullPage: true });

    await openTab('Users');
    await page.getByPlaceholder('Search by name, username or email').fill(username);
    const row = page.getByRole('table', { name: 'Accounts' }).getByRole('row').filter({ hasText: username });
    await expect(row.getByText('Company Admin', { exact: true })).toBeVisible({ timeout: 30000 });
    await row.getByRole('button', { name: /Turn off/ }).click();
    await expect(row.getByText('Turned off')).toBeVisible({ timeout: 30000 });
    await row.getByRole('button', { name: /Turn on/ }).click();
    await expect(row.getByText('Active')).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: path.join(SHOTS, `users_${width}.png`), fullPage: true });
  });
}

// Batch 48 Phase 4: the Audit log shows the Super Admin's own changes (from the tests above) and filters by action.
test('the Audit log lists recorded changes and filters them', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, 'admin@smarttransit.com', /admin\/dashboard/);
  await page.getByRole('button', { name: 'Audit log', exact: true }).click();
  const table = page.getByRole('table', { name: 'Audit log' });
  await expect(table.getByRole('row').nth(1)).toBeVisible({ timeout: 30000 });
  await page.getByPlaceholder('Search actions, for example fare or stop').fill('company.create');
  await expect(table.getByText('company.create').first()).toBeVisible({ timeout: 30000 });
  await expect(table.getByText('user.deactivate')).toHaveCount(0, { timeout: 30000 });
  await expect(table.getByText('admin.patch')).toHaveCount(0);
  await page.screenshot({ path: path.join(SHOTS, 'audit_1280.png'), fullPage: true });
});

// Batch 48 Phase 5: the Payments page (read only): fares and booking fees apart, by month and day, refunds by hand.
for (const width of [1280, 390]) {
  test(`the Payments page shows fares and booking fees apart at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await signIn(page, 'admin@smarttransit.com', /admin\/dashboard/);
    if (width === 390) await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('button', { name: 'Payments', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Booking fees' }).getByText('Booking fees kept')).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'By month' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Payments to refund by hand' })).toBeVisible();
    await page.getByRole('button', { name: 'Last 7 days' }).click();
    await expect(page.getByRole('region', { name: 'Fares' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: path.join(SHOTS, `payments_${width}.png`), fullPage: true });
  });
}

// Batch 48 Phase 6: System health (read only) at both widths.
for (const width of [1280, 390]) {
  test(`System health shows the database, scheduler, jobs and outside services at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await signIn(page, 'admin@smarttransit.com', /admin\/dashboard/);
    if (width === 390) await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('button', { name: 'System health', exact: true }).click();
    const database = page.getByText('Database', { exact: true }).locator('xpath=ancestor::li');
    await expect(database.getByText('Working')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Scheduled tasks')).toBeVisible();
    await expect(page.getByText('Online payments (PayMongo)')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: path.join(SHOTS, `health_${width}.png`), fullPage: true });
  });
}
