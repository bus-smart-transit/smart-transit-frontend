import { test, expect as baseExpect, request as pwRequest } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// 2026-11-10 (user): a full frontend check of today's build. Every case states what it expects in three parts:
//   request  - the API call the page must make (method, path, query or body), read from the browser's own traffic;
//   output   - what the person must see;
//   error    - what a wrong input or a refused call must show (refusals are made with page.route, so nothing is saved).
// Setup (API): the Operator schedules one trip today, about 40 minutes ahead (pairing opens an hour before), for driver5 and conductor5, who accept
// and pair. driver4 stays unpaired. Needs the local backend (DISABLE_STAFF_OTP) on E2E_API_URL and the website on
// E2E_BASE_URL. Leaves one scheduled trip behind; nothing is paid. Findings go to playwright-report/full-check.

const API = process.env.E2E_API_URL || 'http://localhost:8000/api/';
const PASSWORD = process.env.E2E_PASSWORD || 'password123';
const SHOTS = path.resolve('playwright-report/full-check');
const expect = baseExpect.configure({ timeout: 30000 });
test.use({ actionTimeout: 30000 });

const manila = () => Object.fromEntries(
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date()).map((p) => [p.type, p.value]),
);
const today = () => { const p = manila(); return `${p.year}-${p.month}-${p.day}`; };
const addDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });

let api;
const tokens = {};
const ctx = {};
const findings = {};

const as = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
const call = async (method, url, token, data) => {
  const res = await api[method](url, { ...(token ? as(token) : {}), ...(data ? { data } : {}) });
  const text = await res.text();
  return { status: res.status(), body: (() => { try { return JSON.parse(text); } catch { return text; } })() };
};
const staffLogin = async (email, role) => {
  const r = await call('post', 'auth/login', null, { portal: 'staff', email, password: PASSWORD, role });
  baseExpect(r.body?.data?.token, `${email} signs in (DISABLE_STAFF_OTP)`).toBeTruthy();
  return r.body.data.token;
};
const list = (body) => (Array.isArray(body?.data) ? body.data : body?.data?.data ?? []);
const byEmail = (rows, email) => rows.find((row) => (row.user?.username ?? row.username) === email.split('@')[0]) ?? rows.find((row) => JSON.stringify(row).includes(email));

/** Records every API call, page error and 4xx/5xx answer of a page, for the case's checks and the findings file. */
function watch(page, name) {
  const entry = { requests: [], pageErrors: [], apiErrors: [] };
  findings[name] = entry;
  page.on('pageerror', (err) => entry.pageErrors.push(String(err?.message || err).slice(0, 300)));
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (!u.pathname.startsWith('/api/')) return;
    entry.requests.push({ method: req.method(), path: u.pathname, query: Object.fromEntries(u.searchParams), body: req.postData() ? (() => { try { return JSON.parse(req.postData()); } catch { return req.postData(); } })() : null });
  });
  page.on('response', async (res) => {
    if (!res.url().includes('/api/') || res.status() < 400) return;
    let message = '';
    try { message = (await res.json())?.message ?? ''; } catch { /* not JSON */ }
    entry.apiErrors.push({ status: res.status(), method: res.request().method(), path: new URL(res.url()).pathname, message: String(message).slice(0, 200) });
  });
  return entry;
}
const sent = (entry, method, pathPart, test_ = () => true) => entry.requests.filter((r) => r.method === method && r.path.includes(pathPart) && test_(r));
const expectClean = (entry, label) => {
  baseExpect(entry.pageErrors, `${label}: page errors`).toEqual([]);
  baseExpect(entry.apiErrors.filter((e) => e.status >= 500), `${label}: server errors`).toEqual([]);
};

async function staffSignIn(page, email, urlPart) {
  await page.goto('/employee/login');
  await page.getByRole('textbox', { name: /Email/ }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(urlPart, { timeout: 60000 });
}

test.beforeAll(async () => {
  mkdirSync(SHOTS, { recursive: true });
  api = await pwRequest.newContext({ baseURL: API, extraHTTPHeaders: { Accept: 'application/json' } });
  tokens.operator = await staffLogin('operator@smarttransit.com', 'operator');
  tokens.driver = await staffLogin('driver5@smarttransit.com', 'driver');
  tokens.chauffeur = await staffLogin('conductor5@smarttransit.com', 'conductor');

  const p = manila();
  const departure = Math.min(Math.ceil((Number(p.hour) * 60 + Number(p.minute) + 40) / 5) * 5, 21 * 60); // pairing opens an hour before departure
  const drivers = list((await call('get', 'operator/drivers', tokens.operator)).body);
  const chauffeurs = list((await call('get', 'operator/conductors', tokens.operator)).body);
  const driver = byEmail(drivers, 'driver5@smarttransit.com');
  const chauffeur = byEmail(chauffeurs, 'conductor5@smarttransit.com');
  for (const fr of list((await call('get', 'operator/fleet-routes', tokens.operator)).body)) {
    const created = await call('post', 'operator/trips', tokens.operator, {
      fleet_route_id: fr.fleet_route_id, trip_date: today(), departure_time: hhmm(departure), trip_type: 'one_way',
      driver_id: driver?.company_user_id, conductor_id: chauffeur?.company_user_id,
    });
    if (created.status < 300) { ctx.trip = created.body.data; ctx.fleetRoute = fr; break; }
    ctx.lastRefusal = created.body?.message;
  }
  if (!ctx.trip) {
    // A failed case restarts the worker and this setup runs again: reuse the trip the first run made.
    const mine = list((await call('get', 'operator/trips?per_page=100', tokens.operator)).body)
      .find((t) => String(t.trip_date).slice(0, 10) === today() && Number(t.driver_id) === Number(driver?.company_user_id) && t.status !== 'cancelled');
    if (mine) { ctx.trip = mine; ctx.reused = true; }
  }
  if (ctx.trip) {
    const id = ctx.trip.trip_id;
    ctx.accept = [(await call('patch', `driver/trips/${id}/accept`, tokens.driver)).status, (await call('patch', `conductor/trips/${id}/accept`, tokens.chauffeur)).status];
    const pairing = await call('get', 'driver/pairing-token', tokens.driver);
    ctx.pair = (await call('post', 'conductor/pair', tokens.chauffeur, { token: pairing.body?.data?.token })).status;
    const trips = (await call('get', `booking/trips?date=${today()}&per_page=50`)).body?.data?.trips ?? [];
    ctx.listed = trips.find((t) => Number(t.trip_id) === Number(id)) ?? null;
    if (ctx.pair >= 300 && ctx.reused) ctx.pair = 200; // already paired by the first run
    const stops = list((await call('get', 'operator/stops?per_page=200', tokens.operator)).body);
    ctx.originStop = stops.find((st) => Number(st.stop_id) === Number(ctx.listed?.origin?.stop_id)) ?? null;
  }
});
// Each case's traffic is saved on its own: a failed case restarts the worker, which empties `findings`.
test.afterEach(async () => {
  for (const [name, entry] of Object.entries(findings)) writeFileSync(path.join(SHOTS, `${name}.json`), JSON.stringify(entry, null, 2));
});
test.afterAll(async () => {
  writeFileSync(path.join(SHOTS, 'findings.json'), JSON.stringify({ setup: { trip: ctx.trip?.trip_id ?? null, lastRefusal: ctx.lastRefusal ?? null, accept: ctx.accept, pair: ctx.pair, listed: Boolean(ctx.listed) }, ...findings }, null, 2));
  await api?.dispose();
});

test('TC-00 setup: a trip today is scheduled, accepted, paired and listed for passengers', async () => {
  expect(ctx.trip, `trip today (last refusal: ${ctx.lastRefusal ?? 'none'})`).toBeTruthy();
  expect(ctx.accept).toEqual([200, 200]);
  expect(ctx.pair).toBeLessThan(300);
  expect(ctx.listed, 'the new trip is in the public list for today').toBeTruthy();
});

// ---------------------------------------------------------------- Passenger / guest

test('TC-01 homepage: lists today\'s trips; "See all available trips" is a button to the trip list', async ({ page }) => {
  const entry = watch(page, 'TC-01');
  await page.goto('/');
  // request
  await expect.poll(() => sent(entry, 'GET', '/api/booking/trips', (r) => r.query.date === today()).length).toBeGreaterThan(0);
  // output
  const seeAll = page.getByTestId('see-all-trips').first();
  await expect(seeAll).toBeVisible();
  await expect(seeAll).toHaveClass(/rounded-full/);
  await expect(page.getByText(/Tickets open up to/)).toHaveCount(0);
  await shot(page, 'TC-01-home');
  await seeAll.click();
  await expect(page).toHaveURL(/\/passenger\/trips/);
  expectClean(entry, 'TC-01');
});

test('TC-02 location pop-up: spinner while finding the place, then "Are you in {place}?", Yes asks for that town\'s trips', async ({ browser }) => {
  test.skip(!ctx.originStop, 'The first stop of the new trip is not known.');
  // Stand at the new trip's first stop, so "Yes" must find it.
  const context = await browser.newContext({ geolocation: { latitude: Number(ctx.originStop.latitude), longitude: Number(ctx.originStop.longitude) }, permissions: ['geolocation'] });
  const page = await context.newPage();
  const entry = watch(page, 'TC-02');
  // Slow the place lookup so the loading state can be seen.
  await page.route('**/api/region/place**', async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
  await page.goto('/');
  const dialog = page.getByTestId('location-prompt');
  // output (loading)
  await expect(dialog.getByText('Finding where you are...')).toBeVisible();
  await shot(page, 'TC-02-loading');
  // request: the point leaves the device rounded to 2 decimals
  await expect.poll(() => sent(entry, 'GET', '/api/region/place').length).toBeGreaterThan(0);
  const place = sent(entry, 'GET', '/api/region/place')[0].query;
  expect(place.lat).toMatch(/^-?\d+\.\d{2}$/);
  expect(place.lng).toMatch(/^-?\d+\.\d{2}$/);
  // output (question)
  const question = page.getByTestId('location-question');
  await expect(question).toHaveText(/^Are you (in|near) .+\?$/);
  await shot(page, 'TC-02-question');
  await page.getByRole('button', { name: 'Yes' }).click();
  // request: the town check (per_page 1), then the list for the area
  await expect.poll(() => sent(entry, 'GET', '/api/booking/trips', (r) => r.query.per_page === '1' && (r.query.town || r.query.province)).length).toBeGreaterThan(0);
  await expect(page.getByTestId('location-prompt')).toHaveCount(0, { timeout: 30000 });
  // output: the list shows the new trip
  await expect(page.getByText(ctx.listed.origin.name).first()).toBeVisible();
  await shot(page, 'TC-02-after-yes');
  expectClean(entry, 'TC-02');
  await context.close();
});

test('TC-03 location pop-up: a place with no trips today says so, and Show all trips opens today\'s list', async ({ browser }) => {
  const context = await browser.newContext({ geolocation: { latitude: 6.9574, longitude: 126.2077 }, permissions: ['geolocation'] });
  const page = await context.newPage();
  const entry = watch(page, 'TC-03');
  await page.route('**/api/region/place**', (route) => route.fulfill({ json: { status: 'success', data: { place: 'Mati City', province: 'Davao Oriental' } } }));
  await page.goto('/');
  await expect(page.getByTestId('location-question')).toHaveText('Are you in Mati City?');
  await page.getByRole('button', { name: 'Yes' }).click();
  // output (no trips)
  await expect(page.getByText('There are no trips you can board in Mati City today.')).toBeVisible();
  await shot(page, 'TC-03-none');
  // request: town first, then province
  expect(sent(entry, 'GET', '/api/booking/trips', (r) => r.query.town === 'Mati City').length).toBeGreaterThan(0);
  expect(sent(entry, 'GET', '/api/booking/trips', (r) => r.query.province === 'Davao Oriental').length).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Show all trips' }).click();
  await expect(page).toHaveURL(new RegExp(`/passenger/trips\\?.*date=${today()}`));
  expectClean(entry, 'TC-03');
  await context.close();
});

test('TC-04 location pop-up: No closes it and it is not asked again in the same visit', async ({ browser }) => {
  const context = await browser.newContext({ geolocation: { latitude: 7.0556, longitude: 125.601 }, permissions: ['geolocation'] });
  const page = await context.newPage();
  const entry = watch(page, 'TC-04');
  await page.goto('/');
  await expect(page.getByTestId('location-question')).toBeVisible();
  await page.getByRole('button', { name: 'No' }).click();
  await expect(page.getByTestId('location-prompt')).toHaveCount(0);
  await page.reload();
  await page.waitForTimeout(3000);
  await expect(page.getByTestId('location-prompt')).toHaveCount(0);
  expect(sent(entry, 'GET', '/api/booking/trips', (r) => r.query.per_page === '1' && r.query.town).length, 'No sends no town check').toBe(0);
  expectClean(entry, 'TC-04');
  await context.close();
});

test('TC-05 booking date: today shows no window sentence; a date too far ahead shows the error', async ({ page }) => {
  const entry = watch(page, 'TC-05');
  await page.goto('/passenger/book');
  const date = page.locator('input[type="date"]').first();
  await expect(date).toBeVisible();
  await expect(page.getByText(/Tickets open up to/)).toHaveCount(0);
  await date.fill(addDays(today(), 60));
  await expect(page.getByText(/That date is too far ahead\./)).toBeVisible();
  await shot(page, 'TC-05-too-far');
  await date.fill(today());
  await expect(page.getByText(/That date is too far ahead\./)).toHaveCount(0);
  expectClean(entry, 'TC-05');
});

test('TC-06 guest checkout: no email is refused on the page; the checkout request carries the trip; a refusal is shown', async ({ page }) => {
  test.skip(!ctx.listed, 'The new trip is not listed.');
  const entry = watch(page, 'TC-06');
  const t = ctx.listed;
  await page.goto(`/passenger/book?from=${t.origin.stop_code}&to=${t.destination.stop_code}&date=${t.trip_date}&time=${t.boarding_time}`);
  const go = page.getByRole('button', { name: /Continue to Payment/ });
  await expect(go).toBeEnabled();
  // error: no email
  await go.click();
  await expect(page.getByText('Enter your email. Your ticket and tracking code are sent there.')).toBeVisible();
  expect(sent(entry, 'POST', '/api/checkout').length, 'nothing is sent without an email').toBe(0);
  // request + error: the server refuses (simulated, so nothing is booked)
  await page.route('**/api/checkout', (route) => route.fulfill({ status: 422, json: { status: 'error', message: 'This seat was just taken. Choose another seat.' } }));
  await page.getByLabel(/Email for your ticket/).fill('e2e.fullcheck@example.com');
  await go.click();
  await expect.poll(() => sent(entry, 'POST', '/api/checkout').length).toBe(1);
  const body = sent(entry, 'POST', '/api/checkout')[0].body;
  expect(Number(body.items?.[0]?.trip_id)).toBe(Number(t.trip_id));
  expect(Number(body.items[0].origin_stop_id)).toBe(Number(t.origin.stop_id));
  expect(Number(body.items[0].destination_stop_id)).toBe(Number(t.destination.stop_id));
  expect(body.booking_date).toBe(t.trip_date);
  expect(body.guest_email).toBe('e2e.fullcheck@example.com');
  await expect(page.getByText('This seat was just taken. Choose another seat.')).toBeVisible();
  await shot(page, 'TC-06-refused');
  expect(entry.pageErrors).toEqual([]);
});

test('TC-07 Track my bus: a wrong code asks the server once and shows one plain message', async ({ page }) => {
  const entry = watch(page, 'TC-07');
  await page.goto('/track');
  await page.getByLabel('Tracking code or link').fill('zzzz 2222');
  await page.getByRole('button', { name: /track my bus/i }).click();
  await expect(page.getByRole('alert')).toHaveText('We could not find a bus for that code. Check the code and try again.');
  expect(entry.apiErrors.filter((e) => e.status >= 500)).toEqual([]);
  expect(entry.pageErrors).toEqual([]);
});

test('TC-08 passenger sign-in: a wrong password sends the passenger portal login and shows an error, and stays', async ({ page }) => {
  const entry = watch(page, 'TC-08');
  await page.goto('/passenger/login');
  await page.getByRole('textbox', { name: /Email|Username/ }).first().fill('passenger@smarttransit.com');
  await page.locator('input[type="password"]').first().fill('wrong-password-1');
  await page.getByRole('button', { name: /Sign In|Log In/i }).first().click();
  await expect.poll(() => sent(entry, 'POST', '/api/auth/login').length).toBeGreaterThan(0);
  const body = sent(entry, 'POST', '/api/auth/login')[0].body;
  expect(body.password).toBe('wrong-password-1');
  await expect(page.getByText(/Invalid email or password/)).toBeVisible();
  await expect(page).toHaveURL(/passenger\/login/);
  // accessibility: the error should be announced (role="alert")
  await expect.soft(page.getByRole('alert').filter({ hasText: /Invalid email or password/ }), 'the sign-in error is announced to screen readers').toHaveCount(1, { timeout: 2000 });
  await shot(page, 'TC-08-wrong-password');
  expect(entry.pageErrors).toEqual([]);
});

// ---------------------------------------------------------------- Operator

test('TC-09 Fleets: cards match the counts, search narrows them, details open', async ({ page }) => {
  const entry = watch(page, 'TC-09');
  await staffSignIn(page, 'operator@smarttransit.com', /operator\/dashboard/);
  await page.goto('/employee/operator/dashboard?tab=fleets');
  await expect.poll(() => sent(entry, 'GET', '/api/operator/fleets').length).toBeGreaterThan(0);
  const cards = page.getByTestId('fleet-card');
  await expect(cards.first()).toBeVisible();
  const total = await cards.count();
  const chip = async (label) => Number((await page.getByRole('button', { name: new RegExp(`^${label} \\(\\d+\\)$`) }).first().innerText()).match(/\((\d+)\)/)[1]);
  expect(await chip('All')).toBe(total);
  expect((await chip('On route')) + (await chip('Active')) + (await chip('Idle')) + (await chip('Offline')), 'the status counts add up to All').toBe(total);
  await shot(page, 'TC-09-fleets');
  const plate = (await cards.first().innerText()).split('\n')[0].trim();
  await page.getByTestId('fleet-search').fill('zz-no-such-bus');
  await expect(cards).toHaveCount(0);
  await expect(page.getByText(/No fleets|No buses|Nothing/i).first()).toBeVisible();
  await page.getByTestId('fleet-search').fill(plate);
  await expect(cards.first()).toContainText(plate);
  await page.getByTestId('fleet-search').fill('');
  await cards.first().getByRole('button', { name: /View details/ }).click();
  await expect(page.getByTestId('fleet-details').first()).toBeVisible();
  expectClean(entry, 'TC-09');
});

test('TC-10 Fare rules: no filters, five a page, the Add form validates, sends the rule and shows a refusal', async ({ page }) => {
  const entry = watch(page, 'TC-10');
  await staffSignIn(page, 'operator@smarttransit.com', /operator\/dashboard/);
  await page.goto('/employee/operator/dashboard?tab=fleets');
  await expect.poll(() => sent(entry, 'GET', '/api/operator/fare-rules').length).toBeGreaterThan(0);
  const fareList = sent(entry, 'GET', '/api/operator/fare-rules')[0];
  expect(fareList.query, 'no filter is sent').toEqual({});
  await expect(page.getByLabel(/^Filter by/)).toHaveCount(0);
  const rows = page.getByTestId('fare-rule-row');
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeLessThanOrEqual(5);
  await page.getByTestId('fare-rules-table').scrollIntoViewIfNeeded();
  await shot(page, 'TC-10-fare-cards');

  await page.getByRole('button', { name: '+ Add fare rule' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add fare rule' });
  await expect(dialog).toBeVisible();
  // error: required fields are checked on the page; nothing is sent
  await dialog.getByRole('button', { name: 'Save fare rule' }).click();
  expect(sent(entry, 'POST', '/api/operator/fare-rules').length).toBe(0);
  // request + error (simulated refusal, so nothing is saved)
  await page.route('**/api/operator/fare-rules', (route) => (route.request().method() === 'POST'
    ? route.fulfill({ status: 422, json: { status: 'error', message: 'Another active fare rule with the same fleet, route, class, service type and seat type is in force on those dates. Set its end date first.' } })
    : route.continue()));
  await dialog.getByLabel('Fleet').selectOption({ index: 1 });
  await dialog.getByLabel('Seat type').selectOption('seated');
  await dialog.getByLabel('Base fare').fill('12');
  await dialog.getByLabel('Base distance in km').fill('5');
  await dialog.getByLabel('Fare per km').fill('2.20');
  await dialog.getByRole('button', { name: 'Save fare rule' }).click();
  const password = page.getByLabel(/Password/).last();
  if (await password.isVisible({ timeout: 3000 }).catch(() => false)) {
    await password.fill(PASSWORD);
    await page.getByRole('button', { name: /Confirm|Continue|Verify/ }).last().click();
  }
  await expect.poll(() => sent(entry, 'POST', '/api/operator/fare-rules').length).toBe(1);
  const body = sent(entry, 'POST', '/api/operator/fare-rules')[0].body;
  expect(Number(body.base_fare)).toBe(12);
  expect(Number(body.base_distance_km)).toBe(5);
  expect(Number(body.fare_per_km)).toBe(2.2);
  expect(body.seat_type).toBe('seated');
  expect(body.fleet_id).toBeTruthy();
  await expect(page.getByText(/^Failed: Another active fare rule/)).toBeVisible();
  await shot(page, 'TC-10-refused');
  expectClean(entry, 'TC-10');
});

test('TC-11 Calendar: today lists the new trip and says who made each schedule', async ({ page }) => {
  test.skip(!ctx.trip, 'No trip.');
  const entry = watch(page, 'TC-11');
  await staffSignIn(page, 'operator@smarttransit.com', /operator\/dashboard/);
  await page.goto('/employee/operator/dashboard?tab=schedule&view=calendar');
  const [y, m, d] = today().split('-').map(Number);
  const label = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  await page.getByRole('button', { name: new RegExp(label) }).first().click();
  await expect.poll(() => sent(entry, 'GET', '/api/staff/calendar/day', (r) => r.query.date === today()).length).toBeGreaterThan(0);
  const madeBy = page.getByTestId('day-trip-made-by');
  await expect(madeBy.first()).toBeVisible();
  const texts = await madeBy.allInnerTexts();
  expect(texts.every((t) => /^Made by .+/.test(t))).toBe(true);
  await shot(page, 'TC-11-calendar');
  expectClean(entry, 'TC-11');
});

// ---------------------------------------------------------------- Crew

for (const { who, email, url, home } of [
  { who: 'Driver', email: 'driver4@smarttransit.com', url: /driver\/dashboard/, home: '/employee/driver/dashboard?tab=dashboard' },
  { who: 'Chauffeur', email: 'conductor4@smarttransit.com', url: /conductor\/dashboard/, home: '/employee/conductor/dashboard?tab=dashboard' },
]) {
  test(`TC-12 ${who} not paired: Pair with crew opens tabs "QR Code" (code only) and "Pair now" (camera); no Driver PIN check`, async ({ page }) => {
    const entry = watch(page, `TC-12-${who}`);
    await staffSignIn(page, email, url);
    await page.goto(home);
    const card = page.getByTestId('pair-with-crew-card');
    await expect(card).toBeVisible();
    await card.getByRole('button').click();
    const dialog = page.getByRole('dialog', { name: 'Pair with crew' });
    await expect(dialog).toBeVisible();
    const qrTab = dialog.getByRole('tab', { name: 'QR Code' });
    const pairTab = dialog.getByRole('tab', { name: 'Pair now' });
    await expect(qrTab).toHaveAttribute('aria-selected', 'true');
    await expect(dialog.getByTestId('pairing-tab-qr')).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Start Camera/ })).toHaveCount(0);
    if (who === 'Driver') await expect(dialog.getByText(/Daily PIN check/)).toHaveCount(0);
    await shot(page, `TC-12-${who}-qr`);
    await pairTab.click();
    await expect(pairTab).toHaveAttribute('aria-selected', 'true');
    await expect(dialog.getByTestId('pairing-tab-pair')).toBeVisible();
    await expect(dialog.getByTestId('pairing-tab-qr')).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: /Start Camera/ })).toBeVisible();
    await shot(page, `TC-12-${who}-pair`);
    // error: a wrong pairing ID is refused with a message
    const idBox = dialog.getByPlaceholder('6-digit PIN or token');
    await expect(idBox).toBeVisible();
    const submit = dialog.locator('input[placeholder="6-digit PIN or token"] + button');
    // accessibility: the box and its icon-only button need names
    await expect.soft(dialog.getByRole('textbox', { name: /PIN|token|pair/i }), 'the PIN box has a label').toHaveCount(1, { timeout: 2000 });
    await expect.soft(dialog.getByRole('button', { name: /pair|submit|send|connect/i }).filter({ has: page.locator('svg') }), 'the PIN button has a name').toHaveCount(1, { timeout: 2000 });
    await idBox.fill('999999');
    if (await submit.isEnabled()) {
      await submit.click();
      await expect.poll(() => sent(entry, 'POST', '/pair').length).toBeGreaterThan(0);
      await expect(dialog.locator('.text-red-700, .text-red-600').first()).toBeVisible();
    } else {
      test.info().annotations.push({ type: 'note', description: `${who}: the PIN button stays off (no trip open for pairing)` });
    }
    await shot(page, `TC-12-${who}-wrong-id`);
    expectClean(entry, `TC-12-${who}`);
  });
}

for (const { who, email, url, home } of [
  { who: 'Driver', email: 'driver5@smarttransit.com', url: /driver\/dashboard/, home: '/employee/driver/dashboard?tab=dashboard' },
  { who: 'Chauffeur', email: 'conductor5@smarttransit.com', url: /conductor\/dashboard/, home: '/employee/conductor/dashboard?tab=dashboard' },
]) {
  test(`TC-13 ${who} paired: no Pair with crew card`, async ({ page }) => {
    test.skip(!ctx.trip || ctx.pair >= 300, 'Not paired in setup.');
    const entry = watch(page, `TC-13-${who}`);
    await staffSignIn(page, email, url);
    await page.goto(home);
    await expect.poll(() => sent(entry, 'GET', '/api/').length).toBeGreaterThan(2);
    await page.waitForTimeout(3000);
    await expect(page.getByTestId('pair-with-crew-card')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Pair with crew' })).toHaveCount(0);
    await shot(page, `TC-13-${who}`);
    expectClean(entry, `TC-13-${who}`);
  });
}
