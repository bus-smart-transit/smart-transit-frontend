import { test, expect, request } from '@playwright/test';
import path from 'node:path';

// Batch 49 (advisor production test findings), at 1280 and 390 px. Changes nothing that stays: no payment is made,
// no fare is saved and no simulation is started (the confirmation is cancelled).
const PASSWORD = process.env.E2E_PASSWORD || 'password123';
const API = process.env.E2E_API_URL || 'http://localhost:8000/api/';
const SHOTS = path.resolve('test-results/batch49');

async function signIn(page, email, landing) {
  await page.goto('/employee/login');
  await page.getByRole('textbox', { name: /Email or username/ }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(landing, { timeout: 60000 });
}

async function noSidewaysScroll(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
}

/** The first bookable trip in the next days, from the same public list the homepage uses. */
async function aBookableTrip() {
  const api = await request.newContext({ baseURL: API });
  try {
    for (let day = 1; day <= 5; day += 1) {
      const date = new Date(Date.now() + day * 86400000 + 8 * 3600000).toISOString().slice(0, 10);
      const trips = (await (await api.get(`booking/trips?date=${date}&per_page=5`)).json())?.data?.trips ?? [];
      const trip = trips.find((t) => t.bookable);
      if (trip) return trip;
    }
    return null;
  } finally {
    await api.dispose();
  }
}

for (const width of [1280, 390]) {
  test.describe(`at ${width} px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    });

    test('item 1 and 2: the booking page says the seat is saved at checkout, and seats are for the whole bus', async ({ page }) => {
      const trip = await aBookableTrip();
      test.skip(!trip, 'No bookable trip in the next days in this database.');
      const problems = [];
      page.on('pageerror', (error) => problems.push(String(error).slice(0, 200)));
      await page.goto(`/passenger/book?from=${trip.origin.stop_code}&to=${trip.destination.stop_code}&date=${trip.trip_date}&time=${trip.boarding_time}`);

      await expect(page.getByText('Proceed to checkout to save the seat.')).toBeVisible({ timeout: 30000 });
      await expect(page.getByText(/seats? left on this bus/).first()).toBeVisible();
      await noSidewaysScroll(page);
      await page.screenshot({ path: path.join(SHOTS, `booking_${width}.png`), fullPage: true });
      expect(problems).toEqual([]);
    });

    test('item 5: Track my bus takes the short code, and a wrong code gets one plain message', async ({ page }) => {
      await page.goto('/track');
      await page.getByLabel('Tracking code or link').fill('zzzz 2222');
      await page.getByRole('button', { name: /track my bus/i }).click();
      await expect(page.getByRole('alert')).toHaveText('We could not find a bus for that code. Check the code and try again.', { timeout: 30000 });
      await noSidewaysScroll(page);
      await page.screenshot({ path: path.join(SHOTS, `track-code_${width}.png`), fullPage: true });
    });

    test('item 3: the Company Admin fills the Add fare form from a row, and nothing is saved', async ({ page }) => {
      await signIn(page, 'operator@smarttransit.com', /operator\/dashboard/);
      if (width === 390) await page.getByRole('button', { name: 'Open navigation' }).click();
      await page.getByRole('button', { name: 'Fleets', exact: true }).click();
      const use = page.getByRole('button', { name: /^Use fare .* in the form$/ }).first();
      await expect(use).toBeVisible({ timeout: 30000 });
      await use.click();
      await expect(page.getByTestId('fare-copied-note')).toContainText('Change what you need, then save.');
      await expect(page.getByLabel('Base fare')).not.toHaveValue('');
      await page.getByRole('button', { name: 'Clear' }).click();
      await expect(page.getByLabel('Base fare')).toHaveValue('');
      await noSidewaysScroll(page);
      await page.screenshot({ path: path.join(SHOTS, `fare-use-in-form_${width}.png`), fullPage: true });
    });

    test('item 4: the Super Admin GPS simulator asks before taking control of a departed bus', async ({ page }) => {
      await signIn(page, 'admin@smarttransit.com', /admin\/dashboard/);
      if (width === 390) await page.getByRole('button', { name: 'Open navigation' }).click();
      await page.getByRole('button', { name: 'GPS simulator', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'GPS simulator' })).toBeVisible({ timeout: 30000 });
      await expect(page.getByText('Departed trips')).toBeVisible();

      const take = page.getByRole('button', { name: 'Take control of GPS location' }).first();
      if (await take.isVisible() && await take.isEnabled()) {
        await take.click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toContainText('marked Simulated');
        await dialog.getByRole('button', { name: 'Cancel' }).click();
        await expect(dialog).toHaveCount(0);
      } else {
        await expect(page.getByText(/No trip is on the road right now|The GPS simulator is turned off/).first()).toBeVisible();
      }
      await noSidewaysScroll(page);
      await page.screenshot({ path: path.join(SHOTS, `gps-simulator_${width}.png`), fullPage: true });
    });
  });
}
