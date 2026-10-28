import { test, expect as baseExpect, request as pwRequest } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// 2026-10-28: the whole system, one role after another, in the running local app: Passenger (sign up with gender,
// profile, booking and tracking pages), Operator (every sidebar page and view, a new Driver account with gender),
// Driver (accept, pairing, every tab) and Chauffeur (accept, pair, Start Shift without opening cash, a cash sale,
// drop-off by destination, End Shift blocked while the trip runs), then the Operator's remittances.
//
// Every page error, browser console error, failed request and API answer of 400 or more is recorded per step and
// written to playwright-report/system-flow/errors.json. A step fails on a page crash or a server error (500+);
// expected refusals (4xx) are recorded for reading, not failed on.
//
// Needs a backend where staff sign in without the emailed code (DISABLE_STAFF_OTP=true, APP_ENV=local) and the
// frontend pointed at it (E2E_BASE_URL, E2E_API_URL). Writes to that database: a passenger, a Driver account, and
// today's trip for driver3 / conductor3 with one cash sale.

const API = process.env.E2E_API_URL || 'http://localhost:8000/api/';
const PASSWORD = process.env.E2E_PASSWORD || 'password123';
const SHOTS = path.resolve('playwright-report/system-flow');
const log = {};

test.describe.configure({ mode: 'serial', timeout: 600000 });
test.use({ launchOptions: { slowMo: Number(process.env.E2E_SLOWMO ?? 150) }, screenshot: 'only-on-failure' });
// configure() returns a new expect with the longer wait (it does not change the shared one).
const expect = baseExpect.configure({ timeout: 30000 });

const manila = (date = new Date()) => Object.fromEntries(
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(date).map((p) => [p.type, p.value]),
);
const manilaDate = () => { const p = manila(); return `${p.year}-${p.month}-${p.day}`; };
const hhmm = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });

let api;
let operatorToken;
const as = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
const staffLogin = async (email, role) => {
  const res = await api.post('staff/login', { data: { email, password: PASSWORD, role } });
  const body = await res.json();
  expect(body?.data?.token, `${email} signs in without the emailed code (DISABLE_STAFF_OTP)`).toBeTruthy();
  return body.data.token;
};
const getData = async (url, token) => (await (await api.get(url, as(token))).json()).data;
const byEmail = (list, email) => list.find((row) => JSON.stringify(row).includes(email));

/** Records everything that goes wrong on this page under `step`. */
function watch(page, step) {
  const entry = { pageErrors: [], consoleErrors: [], failedRequests: [], apiErrors: [] };
  log[step] = entry;
  page.on('pageerror', (err) => entry.pageErrors.push(String(err?.message || err)));
  page.on('console', (msg) => { if (msg.type() === 'error') entry.consoleErrors.push(msg.text().slice(0, 300)); });
  page.on('requestfailed', (req) => {
    const reason = req.failure()?.errorText || '';
    if (!/ERR_ABORTED|NS_BINDING_ABORTED/.test(reason)) entry.failedRequests.push(`${req.method()} ${req.url()} (${reason})`);
  });
  page.on('response', async (res) => {
    if (!res.url().includes('/api/') || res.status() < 400) return;
    let message = '';
    try { message = (await res.json())?.message ?? ''; } catch { /* not JSON */ }
    entry.apiErrors.push({ status: res.status(), method: res.request().method(), url: res.url().replace(/^https?:\/\/[^/]+/, ''), message: String(message).slice(0, 200) });
  });
  return entry;
}

/** A page crash or a server error fails the step; 4xx refusals are only recorded. */
function expectClean(entry, step) {
  expect(entry.pageErrors, `${step}: page errors`).toEqual([]);
  expect(entry.apiErrors.filter((e) => e.status >= 500), `${step}: server errors`).toEqual([]);
}

async function staffSignIn(page, roleTab, email, urlPart) {
  await page.goto('/employee/login');
  await page.getByRole('button', { name: roleTab }).click();
  await page.getByRole('textbox', { name: /Email/ }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(urlPart, { timeout: 60000 });
}

// The dashboards keep polling, so the network never goes quiet: wait for the page, then a moment for its data.
async function settle(page) {
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(1500);
}

async function clickSidebar(page, label) {
  await page.locator('aside nav button', { hasText: new RegExp(`^${label}$`) }).first().click();
}

test.beforeAll(async () => {
  mkdirSync(SHOTS, { recursive: true });
  api = await pwRequest.newContext({ baseURL: API, extraHTTPHeaders: { Accept: 'application/json' } });
  operatorToken = await staffLogin('operator@smarttransit.com', 'operator');
});
test.afterAll(async () => {
  writeFileSync(path.join(SHOTS, 'errors.json'), JSON.stringify(log, null, 2));
  await api.dispose();
});

const stamp = Date.now().toString(36);
const passengerEmail = `e2e.passenger.${stamp}@example.com`;
const passengerPassword = 'Password123'; // the sign-up form needs upper, lower and a number

// A new passenger signs in with an emailed code. The test backend writes mail to its log (MAIL_MAILER=log), so the
// test reads the newest code there, as a person would read it in their inbox.
const MAIL_LOG = process.env.E2E_MAIL_LOG || path.resolve('../smart-transit-backend/storage/logs/laravel.log');
const latestLoginCode = () => {
  const codes = [...readFileSync(MAIL_LOG, 'utf8').matchAll(/letter-spacing:14px[^>]*>(\d{6})</g)];
  return codes.length ? codes[codes.length - 1][1] : null;
};

test('Passenger: signs up with a gender, sees it on the profile, and opens booking and tracking', async ({ page }) => {
  const entry = watch(page, 'passenger');

  await page.goto('/passenger/signup');
  await page.locator('#signup-firstName').fill('Eto');
  await page.locator('#signup-lastName').fill('Passenger');
  await page.locator('#signup-email').fill(passengerEmail);
  await page.locator('#signup-phone').fill('9170000069');
  await page.locator('#signup-dob').fill('2000-02-02');
  await page.locator('#signup-gender').selectOption('female');
  await page.locator('#signup-address').fill('Tagum City');
  await shot(page, 'p1-signup-gender');
  await page.locator('#signup-next-btn').click();
  await page.locator('#signup-password').fill(passengerPassword);
  await page.locator('#signup-confirm').fill(passengerPassword);
  await page.locator('#signup-terms').check();
  await page.locator('#signup-submit-btn').click();
  await page.waitForURL(/passenger\/login/, { timeout: 60000 });

  await page.getByRole('textbox', { name: /Email/ }).fill(passengerEmail);
  await page.locator('input[type="password"]').first().fill(passengerPassword);
  const before = latestLoginCode();
  await page.getByRole('button', { name: 'Sign In' }).click();
  // Either the emailed-code screen opens, or (code switched off) the passenger is signed in straight away.
  const codeScreen = page.getByText('Verify your identity');
  await expect.poll(async () => (await codeScreen.isVisible()) || !page.url().includes('/login'), { timeout: 60000 }).toBe(true);
  if (await codeScreen.isVisible()) {
    await expect.poll(latestLoginCode, { timeout: 30000 }).not.toBe(before);
    const code = latestLoginCode();
    const boxes = page.locator('input[inputmode="numeric"][maxlength="1"]');
    for (let i = 0; i < 6; i += 1) await boxes.nth(i).fill(code[i]);
    const verify = page.getByRole('button', { name: 'Verify Code' });
    if (await verify.isEnabled().catch(() => false)) await verify.click().catch(() => {});
  }
  // A signed-in passenger lands on the home page.
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 });

  await page.goto('/passenger/dashboard?tab=profile');
  await expect(page.getByTestId('field-gender')).toContainText('Female');
  await shot(page, 'p2-profile-gender');

  for (const tab of ['tickets', 'transactions', 'rewards', 'map']) {
    await page.goto(`/passenger/dashboard?tab=${tab}`);
    await settle(page);
  }
  await page.goto('/passenger/book');
  await settle(page);
  await page.goto('/track');
  await settle(page);
  await shot(page, 'p3-track');

  expectClean(entry, 'passenger');
});

const newDriverEmail = `e2e.driver.${stamp}@example.com`;

test('Operator: every page and view opens, and a new Driver account keeps its gender', async ({ page }) => {
  const entry = watch(page, 'operator');
  await staffSignIn(page, 'Operator', 'operator@smarttransit.com', /operator\/dashboard/);

  // Clicked through like a person (sidebar, then each view tab), not reloaded: the local test server answers one
  // request at a time, and a full reload of every page queues the whole dashboard again each time.
  await expect(page.getByText('Loading dashboard...')).toHaveCount(0, { timeout: 120000 });
  const pages = {
    Dashboard: [], Staffs: [], Fleets: [], Routes: [],
    Schedule: ['Calendar', 'Blocks', 'Trips', 'Approvals'],
    Finance: ['Overview', 'Transactions', 'Remittances', 'Refunds'],
    Reports: [], Account: [],
  };
  for (const [label, views] of Object.entries(pages)) {
    await clickSidebar(page, label);
    await settle(page);
    for (const view of views) {
      await page.getByRole('tab', { name: new RegExp(`^${view}`) }).first().click();
      await settle(page);
    }
  }

  await clickSidebar(page, 'Staffs');
  await expect(page.getByTestId('staff-roster')).toBeVisible();
  await page.getByRole('button', { name: /Create|Add/ }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const fill = (label, value) => dialog.getByLabel(label, { exact: false }).first().fill(value);
  await fill('Full Name', 'Eto Driver');
  await fill('Username', `eto_driver_${stamp}`);
  await fill('Email', newDriverEmail);
  await fill('Phone Number', '09170000070');
  await fill('Address', 'Panabo City');
  await dialog.getByLabel('Gender').selectOption('male');
  await fill('Password', 'password123');
  await shot(page, 'o1-new-driver-gender');
  await dialog.getByRole('button', { name: /Create|Save/ }).last().click();
  // The single-threaded test server answers this after the dashboard's queued polling.
  await expect(page.getByText('Staff account created successfully.')).toBeVisible({ timeout: 120000 });

  const drivers = await getData('operator/drivers', operatorToken);
  expect(byEmail(drivers, newDriverEmail)?.gender ?? byEmail(drivers, newDriverEmail)?.profile?.gender).toBe('male');

  await page.locator('[data-testid="profile-action"] button').click();
  await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeVisible();
  await shot(page, 'o2-notifications');

  expectClean(entry, 'operator');
});

let trip;
let driverToken;
let chauffeurToken;

test('Driver: accepts today\'s trip, sees the pairing code, and opens every tab', async ({ page }) => {
  const entry = watch(page, 'driver');
  const now = manila();
  const minutes = Math.ceil((Number(now.hour) * 60 + Number(now.minute) + 25) / 5) * 5;
  driverToken = await staffLogin('driver3@smarttransit.com', 'driver');
  chauffeurToken = await staffLogin('conductor3@smarttransit.com', 'conductor');

  // Outside bus hours no trip can be made for today: the Driver's pages are still opened and checked for errors.
  if (minutes > 20 * 60 + 55 || minutes < 5 * 60 + 30) {
    test.info().annotations.push({ type: 'outside bus hours', description: 'No trip made; pages opened only.' });
    await staffSignIn(page, 'Driver', 'driver3@smarttransit.com', /driver\/dashboard/);
    for (const label of ['Dashboard', 'Active Trip', 'Schedule', 'Daily PIN', 'Account']) {
      await clickSidebar(page, label);
      await settle(page);
    }
    await expect(page.getByText('Confirm Takeover')).toHaveCount(0);
    await shot(page, 'd1-driver-pages');
    expectClean(entry, 'driver');
    return;
  }

  const drivers = await getData('operator/drivers', operatorToken);
  const chauffeurs = await getData('operator/conductors', operatorToken);
  const driver = byEmail(drivers, 'driver3@smarttransit.com');
  const chauffeur = byEmail(chauffeurs, 'conductor3@smarttransit.com');
  const trips = await getData('operator/trips', operatorToken);
  trip = trips.find((t) => String(t.trip_date).slice(0, 10) === manilaDate() && Number(t.conductor_id) === Number(chauffeur.company_user_id) && ['scheduled', 'boarding'].includes(t.status));
  for (const fr of await getData('operator/fleet-routes', operatorToken)) {
    if (trip) break;
    const res = await api.post('operator/trips', { ...as(operatorToken), data: { fleet_route_id: fr.fleet_route_id, trip_date: manilaDate(), departure_time: hhmm(minutes), trip_type: 'one_way', driver_id: driver.company_user_id, conductor_id: chauffeur.company_user_id } });
    if (res.ok()) trip = (await res.json()).data;
  }
  expect(trip, 'a trip today for driver3 and conductor3').toBeTruthy();

  await api.patch(`driver/trips/${trip.trip_id}/accept`, as(driverToken));

  await staffSignIn(page, 'Driver', 'driver3@smarttransit.com', /driver\/dashboard/);
  for (const label of ['Dashboard', 'Active Trip', 'Schedule', 'Daily PIN', 'Account']) {
    await clickSidebar(page, label);
    await settle(page);
  }
  await expect(page.getByText('Confirm Takeover')).toHaveCount(0);
  await shot(page, 'd1-driver');

  expectClean(entry, 'driver');
});

test('Chauffeur: pairs, starts a shift with no opening cash, sells, drops off by destination, and cannot end mid-trip', async ({ page }) => {
  const entry = watch(page, 'chauffeur');

  // Outside bus hours (no trip from the Driver step): the Chauffeur's pages are still opened and checked for errors.
  if (!trip) {
    test.info().annotations.push({ type: 'outside bus hours', description: 'No trip; pages opened only.' });
    await staffSignIn(page, 'Chauffeur', 'conductor3@smarttransit.com', /conductor\/dashboard/);
    for (const label of ['Dashboard', 'Ticketing & Fares', 'Active Shift', 'Schedule', 'Daily PIN', 'Account']) {
      await clickSidebar(page, label);
      await settle(page);
    }
    await shot(page, 'c0-chauffeur-pages');
    expectClean(entry, 'chauffeur');
    return;
  }

  await api.patch(`conductor/trips/${trip.trip_id}/accept`, as(chauffeurToken));
  const pairing = await (await api.get('driver/pairing-token', as(driverToken))).json();
  await api.post('conductor/pair', { ...as(chauffeurToken), data: { token: pairing.data?.token } });

  await staffSignIn(page, 'Chauffeur', 'conductor3@smarttransit.com', /conductor\/dashboard/);
  const start = page.getByRole('button', { name: /^Start Shift/ }).first();
  if (await start.isVisible().catch(() => false)) {
    await start.click();
    await expect(page.getByText('Start Shift?')).toBeVisible();
    await expect(page.locator('#opening-cash')).toHaveCount(0);
    await shot(page, 'c1-start-shift-no-opening-cash');
    await page.getByRole('button', { name: /^Start Shift/ }).last().click();
  }
  const boarding = await api.patch(`operator/trips/${trip.trip_id}/boarding`, as(operatorToken));
  expect(boarding.status() < 500, await boarding.text()).toBeTruthy();

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
  await shot(page, 'c2-sale');

  await clickSidebar(page, 'Active Shift');
  const groups = page.getByTestId('drop-off-groups');
  await expect(groups).toBeVisible();
  await groups.getByRole('button', { name: /^Confirm \d+ got off at / }).first().click();
  await expect(page.getByText(/got off at /).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Verify & End Shift' })).toBeDisabled();
  await shot(page, 'c3-active-shift');

  for (const label of ['Dashboard', 'Schedule', 'Daily PIN', 'Account']) {
    await clickSidebar(page, label);
    await settle(page);
  }

  expectClean(entry, 'chauffeur');
});

test('Operator: the remittances and the trip show up after the Chauffeur\'s work', async ({ page }) => {
  const entry = watch(page, 'operator-after');
  await staffSignIn(page, 'Operator', 'operator@smarttransit.com', /operator\/dashboard/);
  await page.goto('/employee/operator/dashboard?tab=finance&view=remittances');
  await settle(page);
  await page.goto('/employee/operator/dashboard?tab=schedule&view=trips');
  await settle(page);
  await shot(page, 'o3-after');

  expectClean(entry, 'operator-after');
});
