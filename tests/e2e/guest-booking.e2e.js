import { test, expect as baseExpect, request as pwRequest } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// 2026-10-29: a signed-out passenger buys a ticket online. Each attempt must open the PayMongo checkout; nothing on the
// page may show an error. Runs against any backend (no staff sign-in needed); it books the first trip the public
// trip list offers on E2E_BOOK_DATE (default: the first day with trips in the next 45 days). Every API reply with
// status >= 400 and every error banner is written to playwright-report/guest-booking/errors.json.
// Each attempt holds one seat for 15 minutes; an unpaid hold expires by itself.

const API = process.env.E2E_API_URL || 'http://localhost:8001/api/';
const SHOTS = path.resolve('playwright-report/guest-booking');
const log = [];
const expect = baseExpect.configure({ timeout: 45000 });

test.describe.configure({ mode: 'serial' });

const manilaDate = (offsetDays = 0) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date(Date.now() + offsetDays * 864e5));
let trip;

test.beforeAll(async () => {
  mkdirSync(SHOTS, { recursive: true });
  const api = await pwRequest.newContext({ baseURL: API, extraHTTPHeaders: { Accept: 'application/json' } });
  const dates = process.env.E2E_BOOK_DATE ? [process.env.E2E_BOOK_DATE] : Array.from({ length: 45 }, (_, i) => manilaDate(i));
  for (const date of dates) {
    const trips = (await (await api.get(`booking/trips?date=${date}&per_page=50`)).json()).data?.trips ?? [];
    trip = trips.find((t) => t.origin?.stop_code && t.destination?.stop_code);
    if (trip) break;
  }
  await api.dispose();
});

test.afterAll(() => writeFileSync(path.join(SHOTS, 'errors.json'), JSON.stringify(log, null, 2)));

function watch(page, step) {
  const entry = { step, apiErrors: [], pageErrors: [], banners: [] };
  log.push(entry);
  page.on('pageerror', (err) => entry.pageErrors.push(String(err?.message || err)));
  page.on('response', async (res) => {
    if (!res.url().includes('/api/') || res.status() < 400) return;
    let body = '';
    try { body = (await res.text()).slice(0, 500); } catch { /* body gone */ }
    entry.apiErrors.push({ status: res.status(), url: res.url().replace(/^.*\/api\//, ''), body });
  });
  return entry;
}

async function openBooking(page) {
  const query = new URLSearchParams({ from: trip.origin.stop_code, to: trip.destination.stop_code, date: trip.trip_date, time: trip.boarding_time });
  await page.goto(`/passenger/book?${query}`);
  await expect(page.getByRole('button', { name: /Continue to Payment/ })).toBeEnabled();
}

/** Clicks Continue to Payment; resolves to the checkout tab's URL, or the error the page shows instead. */
async function pay(page, entry) {
  const popup = page.waitForEvent('popup', { timeout: 30000 }).catch(() => null);
  await page.getByRole('button', { name: /Continue to Payment/ }).click();
  const tab = await popup;
  if (tab) {
    await tab.waitForLoadState('domcontentloaded').catch(() => {});
    const url = tab.url();
    await tab.close();
    return { url };
  }
  const banner = (await page.locator('.bg-red-50, [role="alert"]').allInnerTexts()).join(' | ');
  entry.banners.push(banner);
  return { error: banner || 'no checkout tab and no message' };
}

test('a guest pays online: the checkout opens, and a second try of the same booking opens one too', async ({ page }) => {
  test.skip(!trip, 'No trip is bookable online in the next 45 days.');
  const entry = watch(page, 'guest-booking');

  await openBooking(page);
  await page.getByPlaceholder('you@example.com').fill('e2e-guest@example.com');
  await page.screenshot({ path: path.join(SHOTS, '1-form.png'), fullPage: true });

  const first = await pay(page, entry);
  await page.screenshot({ path: path.join(SHOTS, '2-after-first.png'), fullPage: true });
  expect(first.error, 'the first attempt shows no error').toBeUndefined();
  expect(first.url).toMatch(/paymongo/);

  // The passenger closes the payment tab without paying and taps the button again (same tab, same booking).
  await openBooking(page);
  await page.getByPlaceholder('you@example.com').fill('e2e-guest@example.com');
  const second = await pay(page, entry);
  await page.screenshot({ path: path.join(SHOTS, '3-after-second.png'), fullPage: true });
  expect(second.error, 'trying the same booking again shows no error').toBeUndefined();
  expect(second.url).toMatch(/paymongo/);

  expect(entry.pageErrors, 'no script errors').toEqual([]);
});

test('a guest without an email can still pay', async ({ page }) => {
  test.skip(!trip, 'No trip is bookable online in the next 45 days.');
  const entry = watch(page, 'guest-no-email');
  await openBooking(page);
  const result = await pay(page, entry);
  expect(result.error, 'no error without an email').toBeUndefined();
  expect(result.url).toMatch(/paymongo/);
});

/** The reference of the next checkout the page starts. */
const nextReference = (page) => page.waitForResponse((res) => /\/api\/checkout$/.test(new URL(res.url()).pathname) && res.request().method() === 'POST')
  .then(async (res) => (await res.json())?.data?.payment?.transaction_reference ?? null);

test('a guest cancels on the payment page, comes back and books again', async ({ page }) => {
  test.skip(!trip, 'No trip is bookable online in the next 45 days.');
  const entry = watch(page, 'guest-cancel-retry');
  await openBooking(page);
  const ref = nextReference(page);
  const first = await pay(page, entry);
  expect(first.error, 'the first attempt shows no error').toBeUndefined();
  const reference = await ref;
  expect(reference).toMatch(/^TXN-/);

  // PayMongo sends the passenger to the cancel page.
  await page.goto(`/checkout/cancel?ref=${encodeURIComponent(reference)}`);
  await expect(page.getByText('Payment Cancelled')).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, '4-cancel-page.png'), fullPage: true });

  await openBooking(page);
  const again = await pay(page, entry);
  await page.screenshot({ path: path.join(SHOTS, '5-after-cancel-retry.png'), fullPage: true });
  expect(again.error, 'booking again after cancelling shows no error').toBeUndefined();
  expect(again.url).toMatch(/paymongo/);
});

test('a guest reloads the booking page while a payment is open, and can still pay for two tickets', async ({ page }) => {
  test.skip(!trip, 'No trip is bookable online in the next 45 days.');
  const entry = watch(page, 'guest-reload-two');
  await openBooking(page);
  expect((await pay(page, entry)).error).toBeUndefined();

  await page.reload();
  await expect(page.getByRole('button', { name: /Continue to Payment/ })).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, '6-reload-while-pending.png'), fullPage: true });
  await page.locator('#ticket_quantity').fill('2');
  const two = await pay(page, entry);
  await page.screenshot({ path: path.join(SHOTS, '7-two-tickets.png'), fullPage: true });
  expect(two.error, 'two tickets after a reload shows no error').toBeUndefined();
  expect(two.url).toMatch(/paymongo/);
  expect(entry.pageErrors).toEqual([]);
});
