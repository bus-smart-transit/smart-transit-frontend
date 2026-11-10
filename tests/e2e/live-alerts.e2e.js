import { test, expect as baseExpect, request as pwRequest } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// Batch 58 (user, 2026-11-10): live updates (Laravel Reverb) and "Alert operator", in two browsers at once.
// The Driver holds the button and chooses Breakdown; the Operator's banner shows it within 5 s (its own polling is every
// 30 s, so only a live update can be that fast); the Operator marks it handled and the Driver's card says so within 5 s.
// Needs the local backend with BROADCAST_CONNECTION=reverb and Reverb on 8080, the website built with VITE_REVERB_*,
// and a trip of driver5 today that is boarding, delayed or on the road (full-check.e2e.js makes one). Leaves one
// handled alert behind. Request and reply details go to the Playwright report.

const API = process.env.E2E_API_URL || 'http://localhost:8000/api/';
const PASSWORD = process.env.E2E_PASSWORD || 'password123';
const SHOTS = path.resolve('playwright-report/live-alerts');
const expect = baseExpect.configure({ timeout: 30000 });
test.describe.configure({ mode: 'serial' });

async function signIn(page, email, urlPart) {
  await page.goto('/employee/login');
  await page.getByRole('textbox', { name: /Email/ }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(urlPart, { timeout: 60000 });
}

function watchLive(page) {
  const seen = { sockets: [], auth: [] };
  page.on('websocket', (ws) => seen.sockets.push(ws.url()));
  page.on('response', (res) => { if (res.url().includes('/broadcasting/auth')) seen.auth.push(res.status()); });
  return seen;
}

test.beforeAll(() => mkdirSync(SHOTS, { recursive: true }));

test('a site that is not ours cannot open a live connection', async () => {
  const api = await pwRequest.newContext({ baseURL: API, extraHTTPHeaders: { Accept: 'application/json' } });
  const channels = (await (await api.get('live/channels')).json()).data;
  await api.dispose();
  test.skip(!channels?.enabled, 'Live updates are off on this backend.');
  const key = process.env.E2E_REVERB_KEY;
  test.skip(!key, 'Set E2E_REVERB_KEY to the local REVERB_APP_KEY to run this check.');
  const outcome = await new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:8080/app/${key}?protocol=7&client=js&version=8.4.0`, { headers: { Origin: 'https://not-ours.example' } });
    ws.onmessage = (m) => { const d = JSON.parse(m.data); resolve(d.event === 'pusher:connection_established' ? 'accepted' : `refused: ${d.data}`); ws.close(); };
    ws.onerror = () => resolve('refused');
    setTimeout(() => resolve('no answer'), 5000);
  });
  expect(outcome).toMatch(/^refused/);
});

test('the Driver alerts the operator and the Operator sees it live; handling it reaches the Driver live', async ({ browser }) => {
  const opContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const drContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const operator = await opContext.newPage();
  const driver = await drContext.newPage();
  const opLive = watchLive(operator);
  const drLive = watchLive(driver);
  const problems = [];
  for (const page of [operator, driver]) page.on('pageerror', (err) => problems.push(String(err?.message || err)));

  // A Driver's trip shows on the dashboard while their shift is open (Start Shift comes before boarding).
  const api = await pwRequest.newContext({ baseURL: API, extraHTTPHeaders: { Accept: 'application/json' } });
  const login = await (await api.post('auth/login', { data: { portal: 'staff', email: 'driver5@smarttransit.com', password: PASSWORD, role: 'driver' } })).json();
  await api.post('driver/shift/start', { headers: { Authorization: `Bearer ${login?.data?.token}` } });
  await api.dispose();

  await signIn(operator, 'operator@smarttransit.com', /operator\/dashboard/);
  await signIn(driver, 'driver5@smarttransit.com', /driver\/dashboard/);
  await driver.goto('/employee/driver/dashboard?tab=dashboard');
  const card = driver.getByTestId('crew-alert-card');
  test.skip(!(await card.waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false)), 'driver5 has no trip boarding or on the road today.');

  // Both pages hold a live connection (Reverb's /app/ address).
  await expect.poll(() => opLive.sockets.some((url) => url.includes('/app/'))).toBe(true);
  await expect.poll(() => drLive.sockets.some((url) => url.includes('/app/'))).toBe(true);
  await operator.waitForTimeout(1500); // let the company channel sign in

  // Hold for 2 seconds, then choose Breakdown.
  const hold = card.getByRole('button', { name: 'Hold to alert operator' });
  const box = await hold.boundingBox();
  await driver.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await driver.mouse.down();
  await driver.waitForTimeout(2300);
  await driver.mouse.up();
  await card.getByPlaceholder(/flat tyre/).fill('Live check: flat tyre');
  const sentAt = Date.now();
  await card.getByRole('button', { name: 'Breakdown' }).click();
  await expect(card.getByTestId('crew-alert-status')).toContainText('Alert sent. Your operator has been told.');
  await driver.screenshot({ path: path.join(SHOTS, '1-driver-sent.png'), fullPage: true });

  // The Operator's banner shows it within 5 s.
  const banner = operator.getByTestId('operator-alert').filter({ hasText: 'Live check: flat tyre' });
  await expect(banner).toBeVisible({ timeout: 5000 });
  test.info().annotations.push({ type: 'operator saw it after', description: `${Date.now() - sentAt} ms` });
  await expect(banner).toContainText('Breakdown');
  await operator.screenshot({ path: path.join(SHOTS, '2-operator-banner.png'), fullPage: false });
  expect(opLive.auth.some((status) => status === 200), 'the company channel signed in').toBe(true);

  // The Operator marks it handled; the Driver's card says so within 5 s.
  await banner.getByRole('button', { name: 'Mark handled' }).click();
  await banner.getByPlaceholder('Note for the crew (optional)').fill('Spare bus coming');
  const handledAt = Date.now();
  await banner.getByRole('button', { name: 'Mark handled' }).click();
  await expect(card.getByTestId('crew-alert-status')).toContainText('Your operator handled this alert. Note: Spare bus coming', { timeout: 5000 });
  test.info().annotations.push({ type: 'driver saw it after', description: `${Date.now() - handledAt} ms` });
  await driver.screenshot({ path: path.join(SHOTS, '3-driver-handled.png'), fullPage: true });

  expect(problems).toEqual([]);
  await opContext.close();
  await drContext.close();
});
