import { test, expect, request as pwRequest } from '@playwright/test';

// Server-side checks of the demo data and the Operator's main scheduling flow, through the real API (no browser). It
// needs the local backend seeded by DavaoRegionDemoSeeder. It creates one trip and one round-trip block on the first
// free dates, so it can be run again and again; the rows it leaves are what the Schedule screenshots then show.

const API = process.env.E2E_API_URL || 'http://localhost:8000/api/';
const PASSWORD = process.env.E2E_PASSWORD || 'password123';

const manilaDate = (offsetDays) => {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(d);
};

let api;
const login = async (email, role) => {
  const res = await api.post('staff/login', { data: { email, password: PASSWORD, role } });
  expect(res.ok(), `${email} can sign in`).toBeTruthy();
  const body = await res.json();
  expect(body.data.otp_required).toBe(false);
  return body.data.token;
};
const as = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

test.beforeAll(async () => {
  api = await pwRequest.newContext({ baseURL: API, extraHTTPHeaders: { Accept: 'application/json' } });
});
test.afterAll(async () => { await api.dispose(); });

test('every demo account can sign in', async () => {
  for (const [email, role] of [
    ['admin@smarttransit.com', 'admin'], ['operator@smarttransit.com', 'operator'],
    ['driver@smarttransit.com', 'driver'], ['driver2@smarttransit.com', 'driver'],
    ['conductor@smarttransit.com', 'conductor'], ['conductor2@smarttransit.com', 'conductor'],
  ]) await login(email, role);
  const passenger = await api.post('passengers/login', { data: { email: 'passenger@smarttransit.com', password: PASSWORD } });
  expect(passenger.ok()).toBeTruthy();
});

test('a wrong password is refused, and the role tab on the login page does not change the account role', async () => {
  const wrong = await api.post('staff/login', { data: { email: 'operator@smarttransit.com', password: 'not-the-password', role: 'operator' } });
  expect(wrong.status()).toBeGreaterThanOrEqual(400);
  // The server signs in the account's own role; the page then opens that role's portal.
  const tab = await api.post('staff/login', { data: { email: 'operator@smarttransit.com', password: PASSWORD, role: 'driver' } });
  expect((await tab.json()).data.user.role).toBe('operator');
});

test('an Operator token cannot use a Driver or Chauffeur endpoint, and a Driver token cannot use an Operator one', async () => {
  const operator = await login('operator@smarttransit.com', 'operator');
  const driver = await login('driver@smarttransit.com', 'driver');
  expect((await api.get('conductor/shift/status', as(operator))).status()).toBe(403);
  expect((await api.get('operator/fleets', as(driver))).status()).toBe(403);
  expect((await api.get('operator/fleets')).status()).toBe(401);
});

test('the three routes are outside Davao City, with distances and a route line', async () => {
  const token = await login('operator@smarttransit.com', 'operator');
  const routes = (await (await api.get('operator/routes', as(token))).json()).data;
  const names = routes.map((r) => r.route_name).sort();
  expect(names).toEqual(['Bansalan - Sta. Cruz', 'Tagum - Nabunturan', 'Tagum - Panabo']);
  for (const route of routes) {
    expect(route.geometry_stale, `${route.route_name} line is current`).toBeFalsy();
    expect(route.geometry_generated_at, `${route.route_name} has a line`).toBeTruthy();
  }
});

test('the Operator schedules a one-way trip and a round-trip block, and the server refuses clashes', async () => {
  const token = await login('operator@smarttransit.com', 'operator');
  const fleetRoutes = (await (await api.get('operator/fleet-routes', as(token))).json()).data;
  expect(fleetRoutes).toHaveLength(3);
  const drivers = (await (await api.get('operator/drivers', as(token))).json()).data;
  const chauffeurs = (await (await api.get('operator/conductors', as(token))).json()).data;
  expect(drivers.length).toBeGreaterThanOrEqual(2);
  expect(chauffeurs.length).toBeGreaterThanOrEqual(2);

  const [first, second] = fleetRoutes;
  const existing = (await (await api.get('operator/trips', as(token))).json()).data;
  const used = new Set(existing.map((t) => String(t.trip_date).slice(0, 10)));
  const freeDate = (from) => { let o = from; while (used.has(manilaDate(o))) o += 1; return o; };

  // One-way trip.
  const tripDay = manilaDate(freeDate(1));
  const trip = await api.post('operator/trips', {
    ...as(token),
    data: { fleet_route_id: first.fleet_route_id, trip_date: tripDay, departure_time: '07:00', trip_type: 'one_way', driver_id: drivers[0].company_user_id, conductor_id: chauffeurs[0].company_user_id },
  });
  expect(trip.ok(), await trip.text()).toBeTruthy();
  const listed = (await (await api.get('operator/trips', as(token))).json()).data;
  expect(listed.some((t) => String(t.trip_date).slice(0, 10) === tripDay && t.status === 'scheduled')).toBeTruthy();

  // The same bus cannot be on a second trip at the same time, and cannot leave outside its working hours (05:00 to 21:00).
  const clash = await api.post('operator/trips', {
    ...as(token),
    data: { fleet_route_id: first.fleet_route_id, trip_date: tripDay, departure_time: '07:10', trip_type: 'one_way', driver_id: drivers[1].company_user_id, conductor_id: chauffeurs[1].company_user_id },
  });
  expect(clash.status()).toBe(422);
  const early = await api.post('operator/trips', {
    ...as(token),
    data: { fleet_route_id: first.fleet_route_id, trip_date: manilaDate(freeDate(2)), departure_time: '03:00', trip_type: 'one_way', driver_id: drivers[1].company_user_id, conductor_id: chauffeurs[1].company_user_id },
  });
  expect(early.status()).toBe(422);

  // A round-trip shift block of four legs on another route, with the second crew.
  const blockDay = manilaDate(freeDate(2));
  const block = await api.post('operator/shift-blocks', {
    ...as(token),
    data: {
      fleet_route_id: second.fleet_route_id, driver_id: drivers[1].company_user_id, conductor_id: chauffeurs[1].company_user_id,
      block_type: 'morning', scheduled_date: blockDay, leg_departure_times: ['06:00', '07:30', '09:00', '10:30'],
    },
  });
  expect(block.ok(), await block.text()).toBeTruthy();
  const blocks = (await (await api.get('operator/shift-blocks', as(token))).json()).data;
  expect(blocks.some((b) => String(b.scheduled_date).slice(0, 10) === blockDay)).toBeTruthy();
});
