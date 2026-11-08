import { test, expect, request as pwRequest } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// Batch 45 Feature C: on the public map, "Pin My Location" lists the running buses within the radius (measured in the
// browser; the location is never sent), each with next stop, arrival (Live estimate / Scheduled) and Passengers; and
// "Track my bus" asks for the tracking code, shows the trip and opens tracking only after "Yes". Needs a running bus
// on the local backend (gps:simulate) and the Docker backend for a real tracking code (tinker, like trip-day.e2e.js).
const API = process.env.E2E_API_URL || 'http://localhost:8000/api/';
const COMPOSE_DIR = process.env.E2E_COMPOSE_DIR || path.resolve('..');
const SHOTS = path.resolve('playwright-report/nearby-buses');

let bus = null;
let token = null;

test.beforeAll(async () => {
  mkdirSync(SHOTS, { recursive: true });
  const api = await pwRequest.newContext({ baseURL: API, extraHTTPHeaders: { Accept: 'application/json' } });
  const rows = (await (await api.get('fleet/locations')).json()).data ?? [];
  bus = rows.find((r) => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude))) ?? null;
  await api.dispose();

  // A trackable ticket: the newest valid one, or (local test data) a valid copy of the newest ticket on the running trip.
  const php = '$t = App\\Models\\Ticket::whereIn("status", ["valid", "boarded"])->orderByDesc("ticket_id")->first();'
    + (bus?.trip_id ? ` if (! $t && ($src = App\\Models\\Ticket::orderByDesc("ticket_id")->first())) { $t = $src->replicate(["tracking_token_hash", "tracking_token_enc"]); $t->ticket_uuid = (string) Illuminate\\Support\\Str::uuid(); $t->trip_id = ${Number(bus.trip_id)}; $t->status = "valid"; $t->boarded_at = null; $t->alighted_at = null; $t->save(); }` : '')
    + ' echo $t ? "TOKEN:".app(App\\Services\\TicketTrackingService::class)->renew($t) : "NONE";';
  const out = spawnSync('docker', ['compose', 'exec', '-T', 'backend', 'php', 'artisan', 'tinker', '--execute', php], { cwd: COMPOSE_DIR, encoding: 'utf8' });
  token = String(out.stdout).match(/TOKEN:([A-Za-z0-9_-]{43})/)?.[1] ?? null;
});

for (const width of [1280, 390]) {
  test(`buses near the passenger, with destination, arrival and passengers (${width} px)`, async ({ browser }) => {
    test.skip(!bus, 'No running bus on the local backend (start gps:simulate on a boarding or departed trip).');
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      geolocation: { latitude: Number(bus.latitude) + 0.005, longitude: Number(bus.longitude) },
      permissions: ['geolocation'],
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err?.message || err)));

    await page.goto('/track-bus'); // 2026-11-06: the live map moved off the homepage
    const panel = page.getByTestId('nearby-panel');
    await panel.scrollIntoViewIfNeeded();
    await expect(page.getByTestId('nearby-needs-location')).toContainText('Your location stays on this device');
    await page.getByRole('button', { name: /Pin My Location/ }).click();

    await expect(panel.getByText('Buses near you')).toBeVisible({ timeout: 30000 });
    await expect(panel.getByText(/Within \d+(\.\d+)? km of you/)).toBeVisible();
    const details = panel.getByTestId('nearby-bus-details').first();
    // Batch 50 (user): the card shows the destination (not the next stop), when it arrives, and the passengers.
    await expect(details).toContainText('Destination');
    await expect(details).toContainText(/Arrives(\d{2}:\d{2} · (Live estimate|Scheduled)|Not provided)/);
    await expect(details.getByTestId('nearby-bus-passengers')).toHaveText(/^(\d+|Not provided)$/);
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SHOTS, `1-nearby-${width}.png`) });

    expect(pageErrors).toEqual([]);
    await context.close();
  });
}

// Batch 50 (user, 2026-11-08): no bus is chosen at first and every bus shows; choosing one focuses on it alone and
// shows its ETA, location and next stop; "Show all buses" goes back.
test('no bus is chosen at first; choosing one focuses on it until Show all buses', async ({ page }) => {
  test.skip(!bus, 'No running bus on the local backend (start gps:simulate on a boarding or departed trip).');
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err?.message || err)));
  await page.goto('/track-bus');

  const choices = page.getByTestId('bus-choice');
  await expect(choices.first()).toBeVisible({ timeout: 30000 });
  const count = await choices.count();
  await expect(page.getByText(new RegExp(`^${count} bus(es)? on the road$`))).toBeVisible();
  await expect(page.getByTestId('choose-a-bus')).toBeVisible();
  await expect(page.getByTestId('bus-live-panels')).toHaveCount(0);
  await expect(page.getByTestId('show-all-buses')).toHaveCount(0);

  await choices.first().click();
  await expect(choices.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('bus-live-panels')).toBeVisible();
  await expect(page.getByTestId('choose-a-bus')).toHaveCount(0);
  await page.screenshot({ path: path.join(SHOTS, '2-focused.png') });

  await page.getByTestId('show-all-buses').click();
  await expect(page.getByTestId('choose-a-bus')).toBeVisible();
  await expect(page.getByTestId('bus-live-panels')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('Track my bus: a wrong code is refused, a real one shows the trip and opens tracking after Yes', async ({ page }) => {
  test.skip(!token, 'No trackable ticket on the local backend.');
  await page.goto('/track-bus');
  await page.getByTestId('open-track-my-bus').click();
  const dialog = page.getByRole('dialog', { name: 'Track my bus' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel(/Tracking code or link/).fill('not-a-code');
  await dialog.getByRole('button', { name: 'Next' }).click();
  await expect(dialog.getByRole('alert')).toContainText('does not look like a tracking code');

  await dialog.getByLabel(/Tracking code or link/).fill(`https://example.test/track/${token}`);
  await dialog.getByRole('button', { name: 'Next' }).click();
  await expect(dialog.getByTestId('track-my-bus-confirm')).toBeVisible({ timeout: 30000 });
  await expect(dialog.getByText('Is this your trip?')).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, '2-track-confirm.png') });

  await dialog.getByRole('button', { name: 'Yes, track this bus' }).click();
  await page.waitForURL(new RegExp(`/track/${token}$`));
});
