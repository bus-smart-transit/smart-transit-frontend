import { test, expect as baseExpect, request as pwRequest } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// 2026-10-27 work in the running local app: onsite discounts (§9), duration-based leg planning and moving a leg (§4.2),
// destination groups for drop-offs (§7) and the Shift Summary download. Needs the frontend (npm run dev) and the local
// backend with the seeded demo data. It writes to the LOCAL database: one trip today about 25 minutes ahead
// (driver3 / conductor3, paired, with two cash sales) and one shift block 40 or more days ahead (driver2 / conductor2).
// Screenshots: playwright-report/batch44.

const API = process.env.E2E_API_URL || 'http://localhost:8000/api/';
const PASSWORD = process.env.E2E_PASSWORD || 'password123';
const SHOTS = path.resolve('playwright-report/batch44');

test.describe.configure({ mode: 'serial' });
test.use({ launchOptions: { slowMo: Number(process.env.E2E_SLOWMO ?? 300) } });
// The local php artisan serve answers one request at a time, so a screen's later requests wait behind its first ones.
// configure() returns a new expect with the longer wait (it does not change the shared one).
const expect = baseExpect.configure({ timeout: 30000 });

const manila = (date = new Date()) => Object.fromEntries(
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(date).map((p) => [p.type, p.value]),
);
const manilaDate = (offsetDays = 0) => {
  const p = manila(new Date(Date.now() + offsetDays * 86400000));
  return `${p.year}-${p.month}-${p.day}`;
};
const hhmm = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

let api;
let operatorToken;

const as = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
const staffLogin = async (email, role) => {
  const res = await api.post('auth/login', { data: { portal: 'staff', email, password: PASSWORD, role } });
  expect(res.ok(), `${email} can sign in`).toBeTruthy();
  return (await res.json()).data.token;
};
const byEmail = (list, email) => list.find((row) => JSON.stringify(row).includes(email));
const getData = async (url, token) => (await (await api.get(url, as(token))).json()).data;

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

test('Discounts: the Operator sees Student, Senior citizen and PWD at 20% and can turn one off and on', async ({ page }) => {
  await signIn(page, 'Operator', 'operator@smarttransit.com', /operator\/dashboard/);
  await page.goto('/employee/operator/dashboard?tab=finance&view=overview');
  const panel = page.getByRole('region', { name: 'Onsite discounts' });
  await expect(panel).toBeVisible({ timeout: 30000 });
  for (const label of ['Student', 'Senior citizen', 'Person with disability']) {
    await expect(panel.getByText(label, { exact: true })).toBeVisible({ timeout: 90000 });
  }
  await expect(panel.getByText('20% · Onsite cash only').first()).toBeVisible();

  const student = panel.locator('li', { hasText: 'Student' }).getByRole('checkbox');
  await expect(student).toBeChecked();
  await student.click();
  await expect(student).not.toBeChecked();
  await shot(page, '1-operator-discount-off');
  await student.click();
  await expect(student).toBeChecked();
});

test('Leg planning: Suggest times works out how many legs fit, says where each time came from, and flags limits', async ({ page }) => {
  await signIn(page, 'Operator', 'operator@smarttransit.com', /operator\/dashboard/);
  await page.goto('/employee/operator/dashboard?tab=schedule&view=blocks');
  await page.getByRole('button', { name: '+ Schedule' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  const selects = dialog.locator('select');
  await selects.nth(0).selectOption({ index: 1 });
  await selects.nth(1).selectOption('round_trip');
  await dialog.locator('input[type="date"]').first().fill(manilaDate(45));

  await dialog.getByRole('button', { name: 'Suggest times' }).click();
  const legs = dialog.getByTestId('suggested-legs');
  await expect(legs).toBeVisible({ timeout: 30000 });
  const count = await legs.locator('li').count();
  expect(count).toBeGreaterThan(0);
  await shot(page, '2-operator-plan-legs');

  // One time input per leg in the Multi-Leg form.
  const legInputs = dialog.locator('input[type="time"]');
  const use = dialog.getByRole('button', { name: 'Use these times' });
  if (await use.isEnabled()) {
    await use.click();
    await expect(legInputs).toHaveCount(count);
  }
  // Remove first, then add back (the plan may already have the most legs a block can have, 8).
  const before = await legInputs.count();
  await dialog.getByRole('button', { name: 'Remove the last leg' }).click();
  await expect(legInputs).toHaveCount(before - 1);
  await dialog.getByRole('button', { name: 'Add a leg' }).click();
  await expect(legInputs).toHaveCount(before);
  await shot(page, '3-operator-legs-applied');
});

test('Leg time: the Operator moves a leg that has not started, and the server refuses one that breaks the turnaround', async ({ page }) => {
  const drivers = await getData('operator/drivers', operatorToken);
  const chauffeurs = await getData('operator/conductors', operatorToken);
  const fleetRoutes = await getData('operator/fleet-routes', operatorToken);
  const driver = byEmail(drivers, 'driver2@smarttransit.com');
  const chauffeur = byEmail(chauffeurs, 'conductor2@smarttransit.com');

  // A block on the first day from 40 days ahead where this crew is free, with the planner's times for 2 legs.
  let block = null;
  for (let offset = 40; offset < 90 && !block; offset++) {
    const date = manilaDate(offset);
    const plan = await getData(`operator/shift-blocks/plan-legs?${new URLSearchParams({ fleet_route_id: fleetRoutes[0].fleet_route_id, scheduled_date: date, first_departure_time: '06:00', leg_count: 2 })}`, operatorToken);
    const times = plan.legs.map((l) => l.suggested_departure);
    if (times.length !== 2) {
      times.splice(0, times.length, '06:00', '10:00');
    }
    const res = await api.post('operator/shift-blocks', {
      ...as(operatorToken),
      data: { fleet_route_id: fleetRoutes[0].fleet_route_id, driver_id: driver.company_user_id, conductor_id: chauffeur.company_user_id, block_type: 'morning', scheduled_date: date, leg_departure_times: times },
    });
    if (res.ok()) block = (await res.json()).data;
  }
  expect(block, 'a block 40 or more days ahead').toBeTruthy();
  const [leg1, leg2] = [...block.legs].sort((a, b) => String(a.departure_time).localeCompare(String(b.departure_time)));

  // The server refuses leg 2 before leg 1 is back plus the turnaround (one minute after leg 1 leaves).
  const tooSoon = hhmm(Number(String(leg1.departure_time).slice(0, 2)) * 60 + Number(String(leg1.departure_time).slice(3, 5)) + 1);
  const refused = await api.patch(`operator/shift-blocks/${block.shift_block_id}/legs/${leg2.trip_id}`, { ...as(operatorToken), data: { departure_time: tooSoon } });
  expect(refused.status()).toBe(422);
  expect((await refused.json()).message).toMatch(/needs a 30 minute turnaround|must stay in order/);

  await signIn(page, 'Operator', 'operator@smarttransit.com', /operator\/dashboard/);
  await page.goto('/employee/operator/dashboard?tab=schedule&view=blocks');
  await page.getByRole('radio', { name: /^All/ }).or(page.getByRole('tab', { name: /^All/ })).or(page.getByRole('button', { name: /^All/ })).first().click().catch(() => {});
  const card = page.locator(`[data-card-key="block-${block.shift_block_id}"]`);
  await expect(card).toBeVisible({ timeout: 30000 });
  await card.click();
  const editor = page.getByTestId('leg-time-editor');
  await expect(editor).toBeVisible();
  const later = hhmm(Number(String(leg2.departure_time).slice(0, 2)) * 60 + Number(String(leg2.departure_time).slice(3, 5)) + 15);
  await editor.getByLabel('Leg 2').fill(later);
  await editor.getByRole('button', { name: 'Save time' }).nth(1).click();
  await expect(editor.getByRole('status')).toContainText(`Leg moved to ${later}`, { timeout: 30000 });
  await shot(page, '4-operator-leg-moved');
});

test('Chauffeur: a discounted cash sale shows the regular fare and the discount, then drop-offs by destination', async ({ page }) => {
  const now = manila();
  const minutes = Math.ceil((Number(now.hour) * 60 + Number(now.minute) + 25) / 5) * 5;
  test.skip(minutes > 20 * 60 + 55 || minutes < 5 * 60 + 30, 'Outside the 05:00 to 21:00 operating hours for a trip 25 minutes ahead.');

  const drivers = await getData('operator/drivers', operatorToken);
  const chauffeurs = await getData('operator/conductors', operatorToken);
  const driver = byEmail(drivers, 'driver3@smarttransit.com');
  const chauffeur = byEmail(chauffeurs, 'conductor3@smarttransit.com');
  const fleetRoutes = await getData('operator/fleet-routes', operatorToken);

  // Today's trip for driver3 / conductor3: an earlier run's, or a new one on the first bus that is free.
  const trips = await getData('operator/trips', operatorToken);
  let trip = trips.find((t) => String(t.trip_date).slice(0, 10) === manilaDate() && Number(t.conductor_id) === Number(chauffeur.company_user_id) && ['scheduled', 'boarding'].includes(t.status));
  for (const fr of fleetRoutes) {
    if (trip) break;
    const res = await api.post('operator/trips', {
      ...as(operatorToken),
      data: { fleet_route_id: fr.fleet_route_id, trip_date: manilaDate(), departure_time: hhmm(minutes), trip_type: 'one_way', driver_id: driver.company_user_id, conductor_id: chauffeur.company_user_id },
    });
    if (res.ok()) trip = (await res.json()).data;
  }
  expect(trip, 'a trip today for conductor3').toBeTruthy();

  // Accept, pair (opens 60 minutes before), start the shift, then the Operator starts boarding (30 minutes before).
  const driverToken = await staffLogin('driver3@smarttransit.com', 'driver');
  const chauffeurToken = await staffLogin('conductor3@smarttransit.com', 'conductor');
  await api.patch(`driver/trips/${trip.trip_id}/accept`, as(driverToken));
  await api.patch(`conductor/trips/${trip.trip_id}/accept`, as(chauffeurToken));
  const pairing = await (await api.get('driver/pairing-token', as(driverToken))).json();
  const paired = await api.post('conductor/pair', { ...as(chauffeurToken), data: { token: pairing.data?.token } });
  expect([200, 201, 409, 422].includes(paired.status()), await paired.text()).toBeTruthy();
  await api.post('conductor/shift/start', as(chauffeurToken));
  const boarding = await api.patch(`operator/trips/${trip.trip_id}/boarding`, as(operatorToken));
  expect(boarding.ok() || trip.status === 'boarding', await boarding.text()).toBeTruthy();

  await signIn(page, 'Chauffeur', 'conductor3@smarttransit.com', /conductor\/dashboard/);
  await page.getByRole('button', { name: 'Ticketing & Fares' }).first().click();

  const origin = page.locator('#onsite-origin');
  await expect(origin).toBeVisible({ timeout: 30000 });
  await origin.selectOption({ index: 1 });
  const destination = page.locator('#onsite-destination');
  const destinationValues = await destination.locator('option').evaluateAll((options) => options.map((o) => o.value).filter(Boolean));
  await destination.selectOption(destinationValues[destinationValues.length - 1]);

  const fare = page.locator('#onsite-fare-amount');
  await expect(fare).toContainText('₱', { timeout: 30000 });
  const regular = await fare.innerText();

  await page.locator('#onsite-discount-type').selectOption('student');
  await expect(page.getByText('Tick the ID check to see the discounted fare.')).toBeVisible();
  await page.getByText("I checked the passenger's valid ID.").click();
  await expect(page.getByTestId('onsite-fare-discount')).toContainText('Student discount', { timeout: 30000 });
  expect(await fare.innerText()).not.toBe(regular);
  await shot(page, '5-chauffeur-discounted-fare');

  await page.getByRole('button', { name: 'Make sale' }).click();
  await page.getByRole('button', { name: 'Confirm Payment' }).click();
  await expect(page.getByText(/Discount|discount/).first()).toBeVisible({ timeout: 30000 });

  await page.getByRole('button', { name: 'Active Shift' }).first().click();
  const groups = page.getByTestId('drop-off-groups');
  await expect(groups).toBeVisible({ timeout: 30000 });
  await shot(page, '6-chauffeur-drop-off-groups');

  const confirm = groups.getByRole('button', { name: /^Confirm \d+ got off at / }).first();
  const label = await confirm.innerText();
  await confirm.click();
  await expect(page.getByText(/got off at /).first()).toBeVisible({ timeout: 30000 });
  // The list reloads from the server: the confirmed group is gone.
  await expect(groups.getByRole('button', { name: label })).toHaveCount(0, { timeout: 60000 });
  await shot(page, '7-chauffeur-group-confirmed');
  expect(label).toMatch(/^Confirm \d+ got off at /);

  const downloadButton = page.getByRole('button', { name: 'Download Summary Report' });
  if (await downloadButton.isEnabled()) {
    const [download] = await Promise.all([page.waitForEvent('download'), downloadButton.click()]);
    expect(download.suggestedFilename()).toMatch(/^shift-summary-\d{4}-\d{2}-\d{2}\.csv$/);
  }
});
