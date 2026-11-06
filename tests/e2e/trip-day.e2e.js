import { test, expect as baseExpect, request as pwRequest } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// 2026-10-29: one real trip today, start to finish, with the bus moved by the GPS simulator (artisan gps:simulate).
// Operator schedules -> crew accept, pair, start shifts -> boarding and a cash sale -> the Driver's map shows the bus
// icon -> at the departure time the Driver departs and the simulator drives the route -> the homepage tracker shows
// the moving bus and the next-stop ETA (and the stop near a pinned passenger) -> the Driver acknowledges the stops
// and ends the trip -> the Chauffeur's shift closes with the trip -> the Operator sees the remittance.
//
// Runs only between 05:30 and 20:30 Manila (the trip leaves about 10 minutes after it starts). Run it on its own, on a
// database where driver3 has no trip today: batch44.e2e.js and system-flow.e2e.js also give driver3 / conductor3 a
// trip today, and a driver gets one trip per day. Needs a backend with
// DISABLE_STAFF_OTP=true (see system-flow.e2e.js) on E2E_API_URL, the frontend on E2E_BASE_URL pointed at it, and the
// backend for the simulator. The simulator runs in the local Docker backend by default (E2E_SIMULATOR=docker, from
// the root folder E2E_COMPOSE_DIR; the backend needs GPS_SIMULATOR_ENABLED=true, set in the local
// docker-compose.override.yml), or with PHP on this machine (E2E_SIMULATOR=php, E2E_BACKEND_DIR, E2E_PHP).
// Errors per step go to playwright-report/trip-day/errors.json.

const API = process.env.E2E_API_URL || 'http://localhost:8001/api/';
const PASSWORD = process.env.E2E_PASSWORD || 'password123';
const SIMULATOR = process.env.E2E_SIMULATOR || 'docker';
const COMPOSE_DIR = process.env.E2E_COMPOSE_DIR || path.resolve('..');
const BACKEND_DIR = process.env.E2E_BACKEND_DIR || path.resolve('../smart-transit-backend');
const PHP = process.env.E2E_PHP || 'C:/php84/php.exe';
const SHOTS = path.resolve('playwright-report/trip-day');
const log = {};

test.describe.configure({ mode: 'serial', timeout: 30 * 60 * 1000 });
test.use({ launchOptions: { slowMo: Number(process.env.E2E_SLOWMO ?? 100) }, screenshot: 'only-on-failure', actionTimeout: 60000 });
const expect = baseExpect.configure({ timeout: 60000 });

const manila = (date = new Date()) => Object.fromEntries(
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(date).map((p) => [p.type, p.value]),
);
const manilaDate = () => { const p = manila(); return `${p.year}-${p.month}-${p.day}`; };
const nowMinutes = () => { const p = manila(); return Number(p.hour) * 60 + Number(p.minute); };
const hhmm = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });

let api;
const tokens = {};
const ctx = {};
let simulator = null;
const simulatorArgs = (tripId) => ['artisan', 'gps:simulate', String(tripId), '--interval=2', '--step=120', '--accuracy=8'];
function startSimulator(tripId) {
  if (SIMULATOR === 'php') {
    return spawn(PHP, simulatorArgs(tripId), { cwd: BACKEND_DIR, env: { ...process.env, GPS_SIMULATOR_ENABLED: 'true' }, stdio: 'ignore' });
  }
  return spawn('docker', ['compose', 'exec', '-T', 'backend', 'php', ...simulatorArgs(tripId)], { cwd: COMPOSE_DIR, stdio: 'ignore' });
}
// Stopping the docker client does not always stop the command inside the container, so stop it there too.
function stopSimulator() {
  if (simulator && !simulator.killed) simulator.kill();
  if (simulator && SIMULATOR !== 'php') {
    spawnSync('docker', ['compose', 'exec', '-T', 'backend', 'pkill', '-f', 'artisan gps:simulate'], { cwd: COMPOSE_DIR, stdio: 'ignore' });
  }
}

const as = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
const staffLogin = async (email, role) => {
  const body = await (await api.post('auth/login', { data: { portal: 'staff', email, password: PASSWORD, role } })).json();
  expect(body?.data?.token, `${email} signs in without the emailed code (DISABLE_STAFF_OTP)`).toBeTruthy();
  return body.data.token;
};
const getData = async (url, token) => (await (await api.get(url, as(token))).json()).data;
// 2026-11-04: an Operator's staff list has no emails any more (Todo 3 finding 2); demo usernames are the part before the @.
const byEmail = (list, email) => list.find((row) => (row.user?.username ?? row.username) === email.split('@')[0]) ?? list.find((row) => JSON.stringify(row).includes(email));
const call = async (method, url, token, data) => {
  const res = await api[method](url, { ...as(token), ...(data ? { data } : {}) });
  const text = await res.text();
  return { status: res.status(), body: (() => { try { return JSON.parse(text); } catch { return text; } })() };
};

function watch(page, step) {
  const entry = { pageErrors: [], apiErrors: [] };
  log[step] = entry;
  page.on('pageerror', (err) => entry.pageErrors.push(String(err?.message || err)));
  page.on('response', async (res) => {
    if (!res.url().includes('/api/') || res.status() < 400) return;
    let message = '';
    try { message = (await res.json())?.message ?? ''; } catch { /* not JSON */ }
    entry.apiErrors.push({ status: res.status(), method: res.request().method(), url: res.url().replace(/^https?:\/\/[^/]+/, ''), message: String(message).slice(0, 200) });
  });
  return entry;
}
const expectClean = (entry, step) => {
  expect(entry.pageErrors, `${step}: page errors`).toEqual([]);
  expect(entry.apiErrors.filter((e) => e.status >= 500), `${step}: server errors`).toEqual([]);
};

async function staffSignIn(page, email, urlPart) {
  await page.goto('/employee/login');
  await page.getByRole('textbox', { name: /Email/ }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(urlPart, { timeout: 120000 });
}
const clickSidebar = (page, label) => page.locator('aside nav button', { hasText: new RegExp(`^${label}$`) }).first().click();

test.beforeAll(async () => {
  mkdirSync(SHOTS, { recursive: true });
  api = await pwRequest.newContext({ baseURL: API, extraHTTPHeaders: { Accept: 'application/json' } });
  tokens.operator = await staffLogin('operator@smarttransit.com', 'operator');
  tokens.driver = await staffLogin('driver3@smarttransit.com', 'driver');
  tokens.chauffeur = await staffLogin('conductor3@smarttransit.com', 'conductor');
});
test.afterAll(async () => {
  stopSimulator();
  writeFileSync(path.join(SHOTS, 'errors.json'), JSON.stringify({ ...log, trip: ctx.trip?.trip_id ?? null }, null, 2));
  await api.dispose();
});

test('1. Operator schedules a trip today on a route with a road line', async () => {
  const start = nowMinutes();
  test.skip(start < 5 * 60 + 30 || start > 20 * 60 + 30, 'Outside bus hours for a trip about 10 minutes ahead.');
  const departure = Math.ceil((start + 10) / 5) * 5;

  const drivers = await getData('operator/drivers', tokens.operator);
  const chauffeurs = await getData('operator/conductors', tokens.operator);
  const driver = byEmail(drivers, 'driver3@smarttransit.com');
  const chauffeur = byEmail(chauffeurs, 'conductor3@smarttransit.com');

  for (const fr of await getData('operator/fleet-routes', tokens.operator)) {
    const geometry = await call('get', `routes/${fr.route_id}/geometry`, tokens.operator);
    const coords = geometry.body?.data?.coordinates ?? geometry.body?.data?.geometry?.coordinates ?? [];
    if (geometry.status !== 200 || coords.length < 2) continue;
    const created = await call('post', 'operator/trips', tokens.operator, {
      fleet_route_id: fr.fleet_route_id, trip_date: manilaDate(), departure_time: hhmm(departure), trip_type: 'one_way',
      driver_id: driver.company_user_id, conductor_id: chauffeur.company_user_id,
    });
    if (created.status < 300) {
      ctx.trip = created.body.data;
      ctx.routeId = Number(fr.route_id);
      ctx.departure = departure;
      break;
    }
    ctx.lastRefusal = created.body?.message;
  }
  expect(ctx.trip, `a trip today for driver3 and conductor3 (last refusal: ${ctx.lastRefusal ?? 'none'})`).toBeTruthy();
  test.info().annotations.push({ type: 'trip', description: `trip ${ctx.trip.trip_id} leaves at ${hhmm(departure)}` });
});

test('2. Crew accept, pair and start their shifts; boarding opens; the Chauffeur sells a cash ticket', async ({ page }) => {
  test.skip(!ctx.trip, 'No trip.');
  const entry = watch(page, 'boarding');
  const tripId = ctx.trip.trip_id;

  expect((await call('patch', `driver/trips/${tripId}/accept`, tokens.driver)).status).toBeLessThan(500);
  expect((await call('patch', `conductor/trips/${tripId}/accept`, tokens.chauffeur)).status).toBeLessThan(500);
  const pairing = await call('get', 'driver/pairing-token', tokens.driver);
  expect(pairing.status, JSON.stringify(pairing.body)).toBe(200);
  const paired = await call('post', 'conductor/pair', tokens.chauffeur, { token: pairing.body.data.token });
  expect(paired.status, JSON.stringify(paired.body)).toBeLessThan(300);
  expect((await call('post', 'driver/shift/start', tokens.driver)).status).toBeLessThan(500);
  expect((await call('post', 'conductor/shift/start', tokens.chauffeur)).status).toBeLessThan(500);
  const boarding = await call('patch', `driver/trips/${tripId}/boarding`, tokens.driver);
  expect(boarding.status, JSON.stringify(boarding.body)).toBeLessThan(300);

  await staffSignIn(page, 'conductor3@smarttransit.com', /conductor\/dashboard/);
  await clickSidebar(page, 'Ticketing & Fares');
  const origin = page.locator('#onsite-origin');
  await expect(origin).toBeVisible();
  await origin.selectOption({ index: 1 });
  const destination = page.locator('#onsite-destination');
  const values = await destination.locator('option').evaluateAll((options) => options.map((o) => o.value).filter(Boolean));
  await destination.selectOption(values[values.length - 1]);
  await expect(page.locator('#onsite-fare-amount')).toContainText('₱');
  await page.getByRole('button', { name: 'Make sale' }).click();
  await page.getByRole('button', { name: 'Confirm Payment' }).click();
  await expect(page.getByText(/Ticket|sale|Sale/).first()).toBeVisible();
  await shot(page, '1-chauffeur-sale');
  expectClean(entry, 'boarding');
});

test('3. The Driver\'s map shows the bus icon at the phone\'s position', async ({ browser }) => {
  test.skip(!ctx.trip, 'No trip.');
  const stops = (await getData('driver/trips/current/stops', tokens.driver))?.stops ?? [];
  ctx.stops = stops;
  const first = stops[0];
  const context = await browser.newContext({ geolocation: { latitude: Number(first?.latitude ?? 7.4), longitude: Number(first?.longitude ?? 125.8) }, permissions: ['geolocation'] });
  const page = await context.newPage();
  const entry = watch(page, 'driver-map');

  await staffSignIn(page, 'driver3@smarttransit.com', /driver\/dashboard/);
  await clickSidebar(page, 'Active Trip');
  await expect(page.locator('.st-bus-marker').first()).toBeVisible({ timeout: 120000 });
  await shot(page, '2-driver-map-bus-icon');
  expectClean(entry, 'driver-map');
  await context.close();
});

test('4. At the departure time the Driver departs and the simulator drives the route', async () => {
  test.skip(!ctx.trip, 'No trip.');
  // Wait for the departure time (Depart is refused before it).
  while (nowMinutes() < ctx.departure) await new Promise((resolve) => setTimeout(resolve, 15000));
  const depart = await call('patch', `driver/trips/${ctx.trip.trip_id}/depart`, tokens.driver);
  expect(depart.status, JSON.stringify(depart.body)).toBeLessThan(300);

  // The Driver passes the first stop (the terminal), so the ETAs become live.
  if (ctx.stops?.[0]) await call('post', `driver/trips/current/stops/${ctx.stops[0].stop_id}/acknowledge`, tokens.driver);

  simulator = startSimulator(ctx.trip.trip_id);
  await new Promise((resolve) => setTimeout(resolve, 8000));
  expect(simulator.exitCode, 'the simulator is still running (it refuses to start when disabled or in production)').toBeNull();
});

test('5. The homepage tracker shows the moving bus, the next-stop ETA and the stop near a pinned passenger', async ({ browser }) => {
  test.skip(!ctx.trip, 'No trip.');
  const middle = ctx.stops?.[Math.floor((ctx.stops?.length ?? 1) / 2)] ?? ctx.stops?.[0];
  const context = await browser.newContext({ geolocation: { latitude: Number(middle?.latitude ?? 7.4), longitude: Number(middle?.longitude ?? 125.8) }, permissions: ['geolocation'] });
  const page = await context.newPage();
  const entry = watch(page, 'homepage');

  await page.goto('/track-bus'); // 2026-11-06: the live map moved off the homepage
  const icon = page.locator('.st-bus-marker').first();
  await expect(icon).toBeVisible({ timeout: 120000 });
  await expect(page.getByTestId('eta-next')).toBeVisible({ timeout: 120000 });
  const before = await icon.boundingBox();
  await shot(page, '3-homepage-bus-and-eta');

  await page.getByRole('button', { name: /Pin My Location/ }).click();
  await expect(page.getByTestId('eta-near-you')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('.st-you-marker').first()).toBeVisible();
  await page.waitForTimeout(25000); // the tracker polls every 12 s; the simulator moves the bus every 2 s
  const after = await icon.boundingBox();
  await shot(page, '4-homepage-near-you-bus-moved');
  test.info().annotations.push({ type: 'bus moved on screen', description: `${JSON.stringify(before)} -> ${JSON.stringify(after)}` });
  expect(after && before && (Math.abs(after.x - before.x) + Math.abs(after.y - before.y))).toBeGreaterThan(0);
  expectClean(entry, 'homepage');
  await context.close();
});

test('6. The Driver acknowledges the stops and ends the trip; the Chauffeur\'s shift closes with it; the Operator sees the remittance', async ({ page }) => {
  test.skip(!ctx.trip, 'No trip.');
  stopSimulator();
  for (const stop of ctx.stops ?? []) {
    await call('post', `driver/trips/current/stops/${stop.stop_id}/acknowledge`, tokens.driver);
  }
  const complete = await call('patch', `driver/trips/${ctx.trip.trip_id}/complete`, tokens.driver);
  expect(complete.status, JSON.stringify(complete.body)).toBeLessThan(300);

  // A standalone trip (not part of a shift block) closes both crew shifts at End Trip
  // (TripService::closeShiftLogsForTrip). The Chauffeur's remittance opens with no cash declared, for the Operator.
  const entry = watch(page, 'end-of-shift');
  await staffSignIn(page, 'conductor3@smarttransit.com', /conductor\/dashboard/);
  await clickSidebar(page, 'Active Shift');
  await expect(page.getByText('No shift is open, so there is nothing to end.')).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('button', { name: /End Shift/ }).first()).toBeDisabled();
  await shot(page, '5-chauffeur-shift-closed');

  await page.context().clearCookies();
  // Staff sessions live in sessionStorage (TokenManager); clear both so the Operator can sign in.
  await page.evaluate(() => { window.localStorage.clear(); window.sessionStorage.clear(); });
  await staffSignIn(page, 'operator@smarttransit.com', /operator\/dashboard/);
  await page.goto('/employee/operator/dashboard?tab=finance&view=remittances');
  await expect(page.getByTestId('remittance-card').first()).toBeVisible({ timeout: 120000 });
  await shot(page, '6-operator-remittance');
  expectClean(entry, 'end-of-shift');
});
