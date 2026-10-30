import { test, expect, request as pwRequest } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// Phase A, Phase B and onsite-only standing (smarttransit_prompt.md section 0.1) in the running local app. Needs the
// frontend (npm run dev) and the local backend with the seeded demo data. It writes to the LOCAL database: one trip
// today about two hours ahead (driver4 / conductor4) and up to five shift blocks 20 to 24 days ahead (driver /
// conductor). A second run uses the next free five days, so it can be run again. Screenshots: playwright-report/phase-ab
// (test-results/ is emptied by Playwright at the start of every run).

const API = process.env.E2E_API_URL || 'http://localhost:8000/api/';
const PASSWORD = process.env.E2E_PASSWORD || 'password123';
const SHOTS = path.resolve('playwright-report/phase-ab');

test.describe.configure({ mode: 'serial' });
test.use({ launchOptions: { slowMo: Number(process.env.E2E_SLOWMO ?? 400) } });

const manila = (date = new Date()) => Object.fromEntries(
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(date).map((p) => [p.type, p.value]),
);
const manilaDate = (offsetDays = 0) => {
  const p = manila(new Date(Date.now() + offsetDays * 86400000));
  return `${p.year}-${p.month}-${p.day}`;
};

let api;
let operatorToken;
let todayTrip;

const as = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
const staffLogin = async (email, role) => {
  const res = await api.post('auth/login', { data: { portal: 'staff', email, password: PASSWORD, role } });
  expect(res.ok(), `${email} can sign in`).toBeTruthy();
  return (await res.json()).data.token;
};
const byEmail = (list, email) => list.find((row) => JSON.stringify(row).includes(email));

async function signIn(page, roleTab, email, urlPart) {
  await page.goto('/employee/login');
  await page.getByRole('button', { name: roleTab }).click();
  await page.getByRole('textbox', { name: /Email/ }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(urlPart, { timeout: 60000 });
}

const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });

test.beforeAll(async () => {
  mkdirSync(SHOTS, { recursive: true });
  api = await pwRequest.newContext({ baseURL: API, extraHTTPHeaders: { Accept: 'application/json' } });
  operatorToken = await staffLogin('operator@smarttransit.com', 'operator');
});
test.afterAll(async () => { await api.dispose(); });

test('Phase A: a trip two hours ahead cannot board yet, and its Driver sees when pairing opens', async ({ page }) => {
  const now = manila();
  const minutes = Number(now.hour) * 60 + Number(now.minute) + 120;
  const rounded = Math.ceil(minutes / 5) * 5;
  test.skip(rounded > 20 * 60 + 55, 'Too late in the day for a trip two hours ahead inside the 05:00 to 21:00 operating hours.');
  const departure = `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`;

  const drivers = (await (await api.get('operator/drivers', as(operatorToken))).json()).data;
  const chauffeurs = (await (await api.get('operator/conductors', as(operatorToken))).json()).data;
  const driver = byEmail(drivers, 'driver4@smarttransit.com');
  const chauffeur = byEmail(chauffeurs, 'conductor4@smarttransit.com');
  const fleetRoutes = (await (await api.get('operator/fleet-routes', as(operatorToken))).json()).data;
  const fleetRoute = fleetRoutes.find((fr) => fr.route?.route_name === 'Bansalan - Sta. Cruz') ?? fleetRoutes[0];

  const created = await api.post('operator/trips', {
    ...as(operatorToken),
    data: { fleet_route_id: fleetRoute.fleet_route_id, trip_date: manilaDate(), departure_time: departure, trip_type: 'one_way', driver_id: driver.company_user_id, conductor_id: chauffeur.company_user_id },
  });
  if (created.ok()) {
    todayTrip = (await created.json()).data;
  } else {
    // A second run: driver4 already has today's trip from the first run.
    const trips = (await (await api.get('operator/trips', as(operatorToken))).json()).data;
    todayTrip = trips.find((t) => String(t.trip_date).slice(0, 10) === manilaDate() && Number(t.driver_id) === Number(driver.company_user_id));
  }
  expect(todayTrip, 'a trip for driver4 today').toBeTruthy();

  // The server refuses Start Boarding before its window opens (30 minutes before the departure), for the Operator too.
  const early = await api.patch(`operator/trips/${todayTrip.trip_id}/boarding`, as(operatorToken));
  if (String(todayTrip.status) === 'scheduled') {
    expect(early.status()).toBe(422);
    expect((await early.json()).message).toMatch(/^Boarding opens at \d{1,2}:\d{2} (AM|PM)\.$/);
  }

  // The Driver's pairing screen says when pairing opens (60 minutes before) and asks the server for no code yet.
  await signIn(page, 'Driver', 'driver4@smarttransit.com', /driver\/dashboard/);
  await page.goto('/employee/driver/dashboard?tab=pin');
  const notice = page.getByTestId('pairing-not-open');
  await expect(notice).toBeVisible({ timeout: 30000 });
  await expect(notice).toContainText(/Pairing opens at \d{1,2}:\d{2} (AM|PM)/);
  await expect(page.getByRole('button', { name: /Start Camera/ })).toBeDisabled();
  await shot(page, '1-driver-pairing-not-open');
});

test('Standing: online booking offers seats only, and the FAQ says so', async ({ page }) => {
  // The booking page needs a trip bookable today; the server check and the FAQ work with any scheduled trip.
  const list = (await (await api.get(`booking/trips?date=${manilaDate()}&per_page=50`)).json()).data?.trips ?? [];
  const listed = (todayTrip && list.find((t) => Number(t.trip_id) === Number(todayTrip.trip_id))) || list[0];
  if (listed) {
    const query = new URLSearchParams({ from: listed.origin?.stop_code, to: listed.destination?.stop_code, date: listed.trip_date, time: listed.boarding_time });
    await page.goto(`/passenger/book?${query}`);
    await expect(page.getByText('Online tickets reserve a seat. Standing places are sold on the bus.')).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('radio', { name: 'Standing' })).toHaveCount(0);
    await shot(page, '2-passenger-booking-seated-only');
  } else {
    test.info().annotations.push({ type: 'skipped part', description: 'No trip is bookable online today, so the booking page was not opened.' });
  }

  const anyTrip = listed ?? (await (await api.get('operator/trips', as(operatorToken))).json()).data.find((t) => t.status === 'scheduled');
  expect(anyTrip, 'a scheduled trip to send the refused checkout for').toBeTruthy();

  // The server refuses standing online even if a client sends it.
  const refused = await api.post('checkout', { data: {
    payment_channel: 'gcash', guest_name: 'E2E Guest', guest_email: 'e2e-guest@example.com',
    items: [{ trip_id: anyTrip.trip_id, seat_type: 'standing', origin_lat: 7.1, origin_lng: 125.6, destination_lat: 7.2, destination_lng: 125.7 }],
  } });
  expect(refused.status()).toBe(422);
  expect(JSON.stringify(await refused.json())).toContain('Online tickets are for seats only. Standing places are sold on the bus.');

  await page.goto('/');
  await page.getByText('Can I choose my seat?').click();
  await expect(page.getByText(/Every online ticket reserves a seat/)).toBeVisible();
  await shot(page, '3-faq-seats-only');
});

test('Phase B: the Operator previews five days From..To, confirms, and a second preview finds them taken', async ({ page }) => {
  const drivers = (await (await api.get('operator/drivers', as(operatorToken))).json()).data;
  const chauffeurs = (await (await api.get('operator/conductors', as(operatorToken))).json()).data;
  const fleetRoutes = (await (await api.get('operator/fleet-routes', as(operatorToken))).json()).data;
  const rangeBody = (from, to) => ({
    fleet_route_id: fleetRoutes[0].fleet_route_id, driver_id: byEmail(drivers, 'driver@smarttransit.com').company_user_id,
    conductor_id: byEmail(chauffeurs, 'conductor@smarttransit.com').company_user_id, block_type: 'morning', from_date: from, to_date: to,
    leg_departure_times: ['06:00', '08:30', '11:00', '13:30'],
  });
  const previewDays = async (from, to) => {
    const res = await api.post('operator/shift-blocks/range/preview', { ...as(operatorToken), data: rangeBody(from, to) });
    expect(res.ok(), await res.text()).toBeTruthy();
    return (await res.json()).data.days;
  };

  // The first five days from 20 days ahead on which this crew and bus are free (earlier runs took some).
  let offset = 20;
  while (!(await previewDays(manilaDate(offset), manilaDate(offset + 4))).every((d) => d.ok)) {
    offset += 5;
    expect(offset, 'a free five-day window within 90 days').toBeLessThan(90);
  }
  const from = manilaDate(offset);
  const to = manilaDate(offset + 4);

  await signIn(page, 'Operator', 'operator@smarttransit.com', /operator\/dashboard/);
  await page.goto('/employee/operator/dashboard?tab=schedule&view=blocks');
  await page.getByRole('button', { name: '+ Schedule' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  const selects = dialog.locator('select');
  await selects.nth(0).selectOption({ index: 1 }); // the first fleet route
  await selects.nth(1).selectOption('round_trip'); // Multi-Leg Schedule
  await dialog.locator('input[type="date"]').first().fill(from);
  await dialog.getByLabel('To').fill(to);
  await expect(dialog.getByText('5 days. You will see each day before anything is saved.')).toBeVisible();

  const pick = async (placeholder, email) => {
    const select = dialog.locator('select', { has: page.locator('option', { hasText: placeholder }) });
    await expect.poll(async () => (await select.locator('option').allTextContents()).some((t) => t.includes(email)), { timeout: 30000 }).toBeTruthy();
    const value = await select.locator('option', { hasText: email }).getAttribute('value');
    await select.selectOption(value);
  };
  await pick('Select a driver...', 'driver@smarttransit.com');
  await pick('Select a chauffeur...', 'conductor@smarttransit.com');

  await dialog.getByRole('button', { name: 'Preview days' }).click();
  const preview = dialog.getByTestId('range-preview');
  await expect(preview).toBeVisible({ timeout: 30000 });
  await expect(preview.getByTestId('range-day')).toHaveCount(5);
  await shot(page, '4-operator-range-preview');

  const confirm = preview.getByRole('button', { name: /^Schedule \d+ days?$|^No days to schedule$/ });
  if (await confirm.isEnabled()) {
    await confirm.click();
    const result = dialog.getByTestId('range-result');
    await expect(result).toBeVisible({ timeout: 30000 });
    await expect(result.getByTestId('range-day')).toHaveCount(5);
    await shot(page, '5-operator-range-result');
    await result.getByRole('button', { name: 'Done' }).click();
  }

  // A repeated submit of the same range creates nothing: every day is now taken by the blocks above.
  const days = await previewDays(from, to);
  expect(days).toHaveLength(5);
  expect(days.every((d) => d.ok === false)).toBeTruthy();
  expect(days[0].reason).toBe('This driver already has a shift block scheduled for this date.');
});
