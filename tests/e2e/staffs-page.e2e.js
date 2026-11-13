import { test, expect } from '@playwright/test';
import path from 'node:path';

// Batch 46 (2026-11-06): the Operator's Staffs page at 1280 and 390 px. The company name, search, the Add Staff
// form (sign-up fields, +63 phone), crew time in / out with a range, and the calendar day pop-up that opens a trip in
// the Trips view. Changes nothing: the Add Staff form is closed without saving.
const PASSWORD = process.env.E2E_PASSWORD || 'password123';
const SHOTS = path.resolve('test-results/staffs-page');

async function signInOperator(page) {
  await page.goto('/employee/login');
  await page.getByRole('textbox', { name: /Email or username/ }).fill('operator@smarttransit.com');
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/operator\/dashboard/, { timeout: 60000 });
}

const noSidewaysScroll = async (page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
};

for (const width of [1280, 390]) {
  test(`Staffs page at ${width} px: company, search, Add Staff form, crew times`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await signInOperator(page);
    await page.goto('/employee/operator/dashboard?tab=staffs');

    await expect(page.getByText(/Drivers, Chauffeurs and Operators of SmartTransit Demo Bus Co\./)).toBeVisible({ timeout: 60000 });
    await expect(page.getByTestId('profile-company-line').first()).toContainText('SmartTransit Demo Bus Co.');
    await expect(page.getByRole('navigation', { name: 'Staff pages' }).getByText(/Showing 1 to \d+ of \d+/)).toBeVisible();
    await expect(page.getByRole('table', { name: 'Staff Directory' }).getByText('Conductor', { exact: true })).toHaveCount(0);
    await noSidewaysScroll(page);
    await page.screenshot({ path: path.join(SHOTS, `directory_${width}.png`), fullPage: true });

    await page.getByPlaceholder('Search by username, email or role').fill('chauffeur');
    await expect(page.getByRole("table", { name: "Staff Directory" }).getByText("Driver", { exact: true })).toHaveCount(0, { timeout: 30000 });
    await page.getByPlaceholder('Search by username, email or role').fill('nobody-matches-this');
    await expect(page.getByText('No staff match your search.')).toBeVisible({ timeout: 30000 });
    await page.getByPlaceholder('Search by username, email or role').fill('');

    await page.getByRole('button', { name: 'Add Staff' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add Staff' });
    await expect(dialog.getByLabel('First Name')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Phone: country calling code' })).toContainText('+63');
    await dialog.getByRole('button', { name: 'Add Staff' }).click();
    await expect(dialog.getByText('First name is required')).toBeVisible();
    await noSidewaysScroll(page);
    await page.screenshot({ path: path.join(SHOTS, `add-staff_${width}.png`), fullPage: false });
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    // Batch 61: crew time in / out is its own tab.
    await page.getByRole('tab', { name: 'Crew time in/out' }).click();
    await expect(page.getByLabel('From', { exact: true })).toBeVisible();
    await expect(page.getByLabel('To', { exact: true })).toBeVisible();
    await expect(page.getByText('Breaks are not recorded.', { exact: false })).toBeVisible();
  });
}

test('the Schedule calendar opens a day in a pop-up, and a trip there opens the Trips view with it shown', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInOperator(page);
  await page.goto('/employee/operator/dashboard?tab=schedule&view=calendar');

  const marked = page.getByRole('button', { name: /\d+ trips?/ }).first();
  await expect(marked).toBeVisible({ timeout: 60000 });
  await marked.click();
  const dialog = page.getByRole('dialog', { name: 'Trips for the day' });
  const firstTrip = dialog.getByRole('button', { name: /Open trip #\d+ in Trips/ }).first();
  await expect(firstTrip).toBeVisible({ timeout: 30000 });
  const tripId = (await firstTrip.getAttribute('aria-label')).match(/#(\d+)/)[1];
  await firstTrip.click();

  await expect(page.getByTestId('trip-focus-notice')).toContainText(`Trip #${tripId}`, { timeout: 30000 });
  await page.screenshot({ path: path.join(SHOTS, 'calendar-to-trips_1280.png'), fullPage: false });
});
