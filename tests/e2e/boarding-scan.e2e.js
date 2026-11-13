import { test, expect as baseExpect, request as pwRequest, chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';

// 2026-11-13 (user): one trip today, from booking to boarding, through the new crew screens (Batch 61).
//   1. The Operator schedules a trip today (about 20 minutes ahead, so boarding is open).
//   2. A passenger books two seats online and pays (PayMongo's "paid" webhook, signed like PayMongo signs it).
//   3. The crew accept, pair and start their shifts; the Driver presses "Start boarding" on Home (one big button).
//   4. The Chauffeur presses "Scan tickets" on Home and scans ticket A's QR with the camera (a fake camera that shows
//      the QR); the same QR seen again is refused as already boarded.
//   5. The Chauffeur boards ticket B by typing its Ticket ID; a wrong ID and ticket A's ID are refused.
//   6. Both tickets are boarded on the server.
//
// LOCAL ONLY: it writes a trip, a paid booking and boardings, and it reads the webhook secret from the root .env and
// the PayMongo checkout id from the local Docker backend. Needs DISABLE_STAFF_OTP=true (docker-compose.override.yml),
// PayMongo TEST keys in the root .env (checkout creates a test session), and bus hours (05:30 to 20:30 Manila).
// Each step's expected and actual results go to playwright-report/boarding-scan/results.json.

const API = process.env.E2E_API_URL || 'http://localhost:8000/api/';
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173';
const PASSWORD = process.env.E2E_PASSWORD || 'password123';
const ROOT = path.resolve('..');
const SHOTS = path.resolve('playwright-report/boarding-scan');
const results = [];
const note = (step, expected, actual, pass) => {
  results.push({ step, expected, actual, pass });
  writeFileSync(path.join(SHOTS, 'results.json'), JSON.stringify(results, null, 2));
};

test.describe.configure({ mode: 'serial', timeout: 10 * 60 * 1000 });
const expect = baseExpect.configure({ timeout: 45000 });

const manila = () => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((p) => [p.type, p.value]));
const manilaDate = () => { const p = manila(); return `${p.year}-${p.month}-${p.day}`; };
const nowMinutes = () => { const p = manila(); return Number(p.hour) * 60 + Number(p.minute); };
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const envValue = (key) => (readFileSync(path.join(ROOT, '.env'), 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1] ?? '').trim().replace(/^"|"$/g, '');
const tinker = (code) => {
  const out = spawnSync('docker', ['compose', 'exec', '-T', 'backend', 'php', 'artisan', 'tinker', `--execute=${code}`], { cwd: ROOT, encoding: 'utf8' });
  return (out.stdout || '').trim().split('\n').pop();
};

let api;
const tokens = {};
const ctx = {};
const as = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
const call = async (method, url, token, data) => {
  const res = await api[method](url, { ...(token ? as(token) : {}), ...(data ? { data } : {}) });
  const text = await res.text();
  return { status: res.status(), body: (() => { try { return JSON.parse(text); } catch { return text; } })() };
};
const login = async (email, role, portal = 'staff') => (await call('post', 'auth/login', null, { portal, email, password: PASSWORD, ...(role ? { role } : {}) })).body?.data?.token;

async function phoneSignIn(browser, email, urlPart, options = {}) {
  const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 }, ...options });
  const page = await context.newPage();
  page.on('pageerror', (err) => ctx.pageErrors.push(`${email}: ${String(err?.message || err).slice(0, 160)}`));
  await page.goto('/employee/login');
  await page.getByRole('textbox', { name: /Email/ }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(urlPart, { timeout: 120000 });
  return { context, page };
}
const stepOf = (page) => page.getByTestId('crew-next-step').getAttribute('data-step');

test.beforeAll(async () => {
  mkdirSync(SHOTS, { recursive: true });
  ctx.pageErrors = [];
  api = await pwRequest.newContext({ baseURL: API, extraHTTPHeaders: { Accept: 'application/json' } });
  tokens.operator = await login('operator@smarttransit.com', 'operator');
  tokens.passenger = await login('passenger@smarttransit.com', null, 'passenger');
});
test.afterAll(async () => {
  note('page errors', 'none', JSON.stringify(ctx.pageErrors), ctx.pageErrors.length === 0);
  await api.dispose();
});

test('1. The Operator schedules a trip today', async () => {
  const start = nowMinutes();
  test.skip(start < 5 * 60 + 30 || start > 20 * 60 + 30, 'Outside bus hours.');
  const departure = Math.ceil((start + 20) / 5) * 5;
  const drivers = (await call('get', 'operator/drivers', tokens.operator)).body.data;
  const chauffeurs = (await call('get', 'operator/conductors', tokens.operator)).body.data;
  const find = (list, name) => list.find((row) => (row.user?.username ?? row.username) === name);
  // The first demo crew with no trip today (a Driver gets one trip per day).
  for (const n of [1, 2, 3, 5, 4]) {
    const driver = find(drivers, `driver${n}`);
    const chauffeur = find(chauffeurs, `conductor${n}`);
    if (!driver || !chauffeur) continue;
    for (const fr of (await call('get', 'operator/fleet-routes', tokens.operator)).body.data) {
      const created = await call('post', 'operator/trips', tokens.operator, {
        fleet_route_id: fr.fleet_route_id, trip_date: manilaDate(), departure_time: hhmm(departure), trip_type: 'one_way',
        driver_id: driver.company_user_id, conductor_id: chauffeur.company_user_id,
      });
      if (created.status < 300) {
        Object.assign(ctx, { trip: created.body.data, routeId: Number(fr.route_id), crew: n });
        break;
      }
      ctx.lastRefusal = created.body?.message;
    }
    if (ctx.trip) break;
  }
  note('1 schedule', `a trip today leaving ${hhmm(departure)}`, ctx.trip ? `trip #${ctx.trip.trip_id}, driver${ctx.crew} / conductor${ctx.crew}` : `refused: ${ctx.lastRefusal}`, Boolean(ctx.trip));
  expect(ctx.trip, ctx.lastRefusal).toBeTruthy();
  tokens.driver = await login(`driver${ctx.crew}@smarttransit.com`, 'driver');
  tokens.chauffeur = await login(`conductor${ctx.crew}@smarttransit.com`, 'conductor');
});

test('2. A passenger books two seats online and pays', async () => {
  test.skip(!ctx.trip, 'No trip.');
  const stops = JSON.parse(tinker(`echo json_encode(App\\Models\\RouteStop::where("route_id",${ctx.routeId})->orderBy("stop_order")->pluck("stop_id"));`));
  const item = { trip_id: ctx.trip.trip_id, seat_type: 'seated', origin_stop_id: stops[0], destination_stop_id: stops[stops.length - 1] };
  const checkout = await call('post', 'passengers/checkout', tokens.passenger, { booking_date: manilaDate(), payment_channel: 'gcash', items: [item, item] });
  expect(checkout.status, JSON.stringify(checkout.body).slice(0, 300)).toBeLessThan(300);
  const paymentId = checkout.body.data?.payment?.payment_id ?? checkout.body.data?.payment_id;
  const session = tinker(`echo App\\Models\\Payment::find(${paymentId})->gateway_reference;`);

  const payload = JSON.stringify({ data: { id: `evt_e2e${Date.now()}`, type: 'event', attributes: { type: 'checkout_session.payment.paid', livemode: false, data: { id: session, type: 'checkout_session', attributes: {} }, created_at: Math.floor(Date.now() / 1000), updated_at: Math.floor(Date.now() / 1000) } } });
  const ts = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', envValue('PAYMONGO_WEBHOOK_SECRET')).update(`${ts}.${payload}`).digest('hex');
  const hook = await api.post('webhooks/paymongo', { headers: { 'Content-Type': 'application/json', 'Paymongo-Signature': `t=${ts},te=${sig},li=` }, data: payload });
  expect(hook.status()).toBe(200);

  const mine = (await call('get', 'passengers/tickets?per_page=50', tokens.passenger)).body.data;
  const rows = (Array.isArray(mine) ? mine : mine.data).filter((t) => Number(t.trip_id) === Number(ctx.trip.trip_id));
  ctx.tickets = rows.map((t) => ({ uuid: t.ticket_uuid, qr: t.qr_content || t.ticket_uuid, id: String(t.ticket_uuid).slice(0, 8).toUpperCase(), status: t.status }));
  note('2 book and pay', 'two valid tickets on the trip', JSON.stringify(ctx.tickets.map((t) => `${t.id}:${t.status}`)), ctx.tickets.length === 2 && ctx.tickets.every((t) => t.status === 'valid'));
  expect(ctx.tickets).toHaveLength(2);
});

test('3. The crew start; the Driver presses "Start boarding" on Home', async ({ browser }) => {
  test.skip(!ctx.tickets, 'No tickets.');
  const tripId = ctx.trip.trip_id;
  await call('patch', `driver/trips/${tripId}/accept`, tokens.driver);
  await call('patch', `conductor/trips/${tripId}/accept`, tokens.chauffeur);
  const pairing = await call('get', 'driver/pairing-token', tokens.driver);
  const paired = await call('post', 'conductor/pair', tokens.chauffeur, { token: pairing.body?.data?.token });
  expect(paired.status, JSON.stringify(paired.body)).toBeLessThan(300);
  const driverShift = await call('post', 'driver/shift/start', tokens.driver);
  const chauffeurShift = await call('post', 'conductor/shift/start', tokens.chauffeur);
  note('3 shifts', 'both shifts start (2xx)', `driver ${driverShift.status}, chauffeur ${chauffeurShift.status} ${chauffeurShift.status >= 300 ? JSON.stringify(chauffeurShift.body).slice(0, 160) : ''}`, driverShift.status < 300 && chauffeurShift.status < 300);
  expect(chauffeurShift.status, JSON.stringify(chauffeurShift.body)).toBeLessThan(300);

  const { context, page } = await phoneSignIn(browser, `driver${ctx.crew}@smarttransit.com`, /driver\/dashboard/);
  await expect(page.getByTestId('crew-next-step')).toHaveAttribute('data-step', 'boarding', { timeout: 60000 });
  await page.screenshot({ path: path.join(SHOTS, '3a-driver-home-start-boarding.png') });
  await page.getByTestId('crew-next-step').getByRole('button', { name: /Start boarding/ }).click();
  await expect(page.getByTestId('crew-next-step')).toHaveAttribute('data-step', 'depart', { timeout: 60000 });
  await page.screenshot({ path: path.join(SHOTS, '3b-driver-home-depart.png') });
  note('3 start boarding', 'Home step "Start boarding", then "Depart" after pressing it', `step now ${await stepOf(page)}`, true);
  await context.close();
});

test('4. The Chauffeur scans ticket A\'s QR with the camera; scanning it again is refused', async () => {
  test.skip(!ctx.tickets, 'No tickets.');
  const [a] = ctx.tickets;
  // A fake camera that shows ticket A's QR: a Motion JPEG of the QR on white.
  const render = await chromium.launch({ channel: 'msedge' });
  const page0 = await render.newPage({ viewport: { width: 640, height: 480 } });
  await page0.setContent(`<body style="margin:0;background:#fff;display:flex;align-items:center;justify-content:center;height:480px"><img src="${await QRCode.toDataURL(a.qr, { width: 360, margin: 2 })}"></body>`);
  const frame = await page0.screenshot({ type: 'jpeg', quality: 92 });
  await render.close();
  const camera = path.join(SHOTS, 'ticket-a.mjpeg');
  writeFileSync(camera, Buffer.concat([frame, frame, frame]));

  const browser = await chromium.launch({ channel: 'msedge', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${camera}`] });
  const { page } = await phoneSignIn(browser, `conductor${ctx.crew}@smarttransit.com`, /conductor\/dashboard/, { permissions: ['camera'] });
  ctx.chauffeurBrowser = browser;
  ctx.chauffeur = page;
  await page.goto('/employee/conductor/dashboard?tab=dashboard');
  await expect(page.getByTestId('crew-next-step')).toHaveAttribute('data-step', 'tickets', { timeout: 60000 });
  await page.screenshot({ path: path.join(SHOTS, '4a-chauffeur-home-scan-tickets.png') });
  await page.getByTestId('crew-next-step').getByRole('button', { name: /Scan tickets/ }).click();
  await page.getByRole('button', { name: /Start camera/ }).click();
  const result = page.getByTestId('scan-result');
  await expect(result).toContainText('boarded successfully', { timeout: 60000 });
  const first = await result.textContent();
  await page.screenshot({ path: path.join(SHOTS, '4b-chauffeur-qr-boarded.png') });
  note('4 QR scan', '"Ticket validated and boarded successfully"', first, /boarded successfully/.test(first));

  // The camera keeps seeing the same QR: after the 3-second repeat guard it is scanned again and refused.
  await expect(result).toContainText('already boarded', { timeout: 60000 });
  const again = await result.textContent();
  await page.screenshot({ path: path.join(SHOTS, '4c-chauffeur-qr-again-refused.png') });
  note('4 same QR again (expected error)', '"Ticket is already boarded."', again, /already boarded/.test(again));
  await page.getByRole('button', { name: /Stop camera/ }).click();
});

test('5. The Chauffeur boards ticket B by its Ticket ID; a wrong ID and ticket A\'s ID are refused', async () => {
  test.skip(!ctx.chauffeur, 'No Chauffeur page.');
  const page = ctx.chauffeur;
  const [a, b] = ctx.tickets;
  const box = page.getByLabel('No QR? Type the Ticket ID');
  const result = page.getByTestId('scan-result');
  const board = async (code) => {
    await box.fill(code);
    await page.getByRole('button', { name: 'Board', exact: true }).click();
    await expect(result).not.toContainText('Processing', { timeout: 30000 });
    await page.waitForTimeout(1500);
    return (await result.textContent()) ?? '';
  };

  const ok = await board(b.id);
  note('5 Ticket ID', `ticket B (${b.id}) "boarded successfully"`, ok, /boarded successfully/.test(ok));
  await page.screenshot({ path: path.join(SHOTS, '5a-chauffeur-ticket-id-boarded.png') });
  const badShape = await board('ZZZZ9999');
  note('5 badly formed Ticket ID (expected error)', '"Enter the ticket QR code or its 8-character Ticket ID."', badShape, /8-character Ticket ID/.test(badShape));
  const missing = await board(a.id === 'FFFFFFF0' ? 'FFFFFFF1' : 'FFFFFFF0');
  note('5 well formed but unknown Ticket ID (expected error)', '"Ticket not found on this trip."', missing, /not found/i.test(missing));
  const twice = await board(a.id);
  note('5 ticket A by ID again (expected error)', '"Ticket is already boarded."', twice, /already boarded/.test(twice));
  await page.screenshot({ path: path.join(SHOTS, '5b-chauffeur-ticket-id-refused.png') });
  await ctx.chauffeurBrowser.close();
  expect(ok).toMatch(/boarded successfully/);
});

test('6. Both tickets are boarded on the server', async () => {
  test.skip(!ctx.tickets, 'No tickets.');
  const mine = (await call('get', 'passengers/tickets?per_page=50', tokens.passenger)).body.data;
  const rows = (Array.isArray(mine) ? mine : mine.data).filter((t) => Number(t.trip_id) === Number(ctx.trip.trip_id));
  const statuses = rows.map((t) => t.status);
  note('6 server', 'both tickets "boarded"', JSON.stringify(statuses), statuses.length === 2 && statuses.every((s) => s === 'boarded'));
  expect(statuses).toEqual(['boarded', 'boarded']);
});
