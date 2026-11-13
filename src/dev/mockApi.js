// 2026-11-13: UI preview mode. With VITE_MOCK_API=true in .env.local (dev server only), every API call is answered
// here with sample data instead of going to the backend, so the Operator pages can be designed without Docker,
// a database or the emailed sign-in code. Any email and password signs in as an Operator. Nothing is saved:
// writes answer "ok" and change nothing. A production build never includes this file (see services/api.js).

import { getBusinessToday } from '../utils/dates';

const today = getBusinessToday();

const ROUTES = [
  { route_id: 1, route_name: 'Davao City - Tagum', origin: 'Davao City', destination: 'Tagum' },
  { route_id: 2, route_name: 'Davao City - Digos', origin: 'Davao City', destination: 'Digos' },
  { route_id: 3, route_name: 'Davao City - Mati', origin: 'Davao City', destination: 'Mati' },
];

const FLEETS = [
  { fleet_id: 1, plate_number: 'LAB 1023', seated_capacity: 45, standing_capacity: 10, status: 'active' },
  { fleet_id: 2, plate_number: 'LAB 2047', seated_capacity: 45, standing_capacity: 10, status: 'active' },
  { fleet_id: 3, plate_number: 'NBC 3381', seated_capacity: 49, standing_capacity: 0, status: 'active' },
  { fleet_id: 4, plate_number: 'NBC 4410', seated_capacity: 49, standing_capacity: 0, status: 'active' },
  { fleet_id: 5, plate_number: 'KDA 5520', seated_capacity: 40, standing_capacity: 15, status: 'maintenance' },
].map((fleet) => ({ ...fleet, capacity: fleet.seated_capacity + fleet.standing_capacity }));

const person = (id, name, role) => ({ id, user_id: id, name, role, user: { id, name, username: name.toLowerCase().replace(/\s+/g, '.') } });
const DRIVERS = [person(11, 'Ramon Dela Cruz', 'driver'), person(12, 'Jun Abellana', 'driver'), person(13, 'Carlo Mendoza', 'driver')];
const CONDUCTORS = [person(21, 'Liza Pacquiao', 'conductor'), person(22, 'Mark Sarmiento', 'conductor'), person(23, 'Ana Villareal', 'conductor')];

const fleetRoute = (fleetId, routeId) => {
  const fleet = FLEETS.find((f) => f.fleet_id === fleetId);
  const route = ROUTES.find((r) => r.route_id === routeId);
  return { fleet_route_id: fleetId * 10 + routeId, fleet_id: fleetId, route_id: routeId, fleet, route };
};

const trip = (id, time, fleetId, routeId, status, sold, driver, conductor) => ({
  trip_id: id,
  trip_date: today,
  departure_time: `${time}:00`,
  status,
  service_type: 'regular',
  total_occupancy: sold,
  fleet_route: fleetRoute(fleetId, routeId),
  driver: driver ?? null,
  driver_id: driver?.id ?? null,
  conductor: conductor ?? null,
  conductor_id: conductor?.id ?? null,
});

const TRIPS = [
  trip(101, '05:30', 1, 1, 'completed', 52, DRIVERS[0], CONDUCTORS[0]),
  trip(102, '06:15', 2, 2, 'completed', 41, DRIVERS[1], CONDUCTORS[1]),
  trip(103, '07:00', 3, 3, 'departed', 47, DRIVERS[2], CONDUCTORS[2]),
  trip(104, '08:30', 1, 1, 'boarding', 33, DRIVERS[0], CONDUCTORS[0]),
  trip(105, '09:00', 4, 2, 'delayed', 18, DRIVERS[1], null),
  trip(106, '11:45', 2, 3, 'scheduled', 12, null, CONDUCTORS[1]),
  trip(107, '14:00', 3, 1, 'scheduled', 6, DRIVERS[2], CONDUCTORS[2]),
  trip(108, '16:30', 4, 2, 'scheduled', 0, null, null),
];

const LOCATIONS = [
  { fleet_id: 3, trip_id: 103, latitude: 7.1907, longitude: 125.4553, accuracy_m: 8, recorded_at: new Date().toISOString() },
  { fleet_id: 1, trip_id: 104, latitude: 7.0731, longitude: 125.6128, accuracy_m: 12, recorded_at: new Date().toISOString() },
];

const PROFILE = {
  id: 2,
  name: 'Demo Operator',
  email: 'operator@smarttransit.com',
  role: 'operator',
  company: { company_id: 1, company_name: 'Davao Demo Transit' },
};

const STOPS = ROUTES.flatMap((route) => [route.origin, route.destination]).filter((v, i, a) => a.indexOf(v) === i)
  .map((name, index) => ({ stop_id: index + 1, stop_name: `${name} Terminal`, municipality: name }));

const NOTIFICATIONS = [
  { id: 'n1', title: 'Trip #105 is delayed', message: 'Davao City - Digos, 09:00 has not departed yet.', read_at: null, created_at: new Date().toISOString() },
  { id: 'n2', title: 'Payment received', message: '12 online tickets were paid for this morning.', read_at: new Date().toISOString(), created_at: new Date(Date.now() - 3600e3).toISOString() },
];

const staffRow = (p, role) => ({ company_user_id: p.id, user_id: p.id, name: p.name, username: p.user.username, role, is_active: true });

/** [method, url pattern, handler(match, config) => body]. First match wins; unmatched GETs answer an empty list. */
const HANDLERS = [
  ['POST', /^\/auth\/login$/, () => ({ data: { otp_required: false, token: 'preview-token', user: { ...PROFILE } } })],
  ['GET', /^\/(operator|staff)\/profile$/, () => ({ data: PROFILE })],
  ['GET', /^\/operator\/trips$/, () => ({ data: TRIPS, meta: { current_page: 1, last_page: 1, per_page: 100, total: TRIPS.length } })],
  ['GET', /^\/operator\/fleets$/, () => ({ data: FLEETS.map((f) => ({ ...f, fleet_routes: ROUTES.slice(0, 2).map((r) => fleetRoute(f.fleet_id, r.route_id)) })) })],
  ['GET', /^\/operator\/routes$/, () => ({ data: ROUTES })],
  ['GET', /^\/operator\/routes\/(\d+)$/, ([, id]) => ({ data: ROUTES.find((r) => r.route_id === Number(id)) ?? ROUTES[0] })],
  ['GET', /^\/operator\/stops$/, () => ({ data: STOPS })],
  ['GET', /^\/operator\/fleet-routes$/, () => ({ data: FLEETS.flatMap((f) => ROUTES.slice(0, 2).map((r) => fleetRoute(f.fleet_id, r.route_id))) })],
  ['GET', /^\/operator\/drivers$/, () => ({ data: DRIVERS })],
  ['GET', /^\/operator\/conductors$/, () => ({ data: CONDUCTORS })],
  ['GET', /^\/fleet\/locations$/, () => ({ data: LOCATIONS.map((l) => ({ ...l, recorded_at: new Date().toISOString() })) })],
  ['GET', /^\/operator\/notifications$/, () => ({ data: NOTIFICATIONS })],
  ['GET', /^\/operator\/fleets\/\d+\/reports\/route-adherence$/, () => ({ data: { summary: { trips_with_gps_data: 14, deviated_trips: 1, adherence_rate_pct: 93 } } })],
  ['GET', /^\/operator\/staff$/, () => ({
    data: {
      staff: [...DRIVERS.map((d) => staffRow(d, 'driver')), ...CONDUCTORS.map((c) => staffRow(c, 'conductor'))],
      pagination: { page: 1, per_page: 10, total: 6, last_page: 1 },
      totals: { driver: DRIVERS.length, conductor: CONDUCTORS.length },
      company: PROFILE.company,
    },
  })],
  ['GET', /^\/staff\/calendar-summary$/, () => ({ data: null })],
  ['GET', /^\/staff\/calendar\/days$/, () => {
    const counts = [6, 9, 7, 10, 8, 6, TRIPS.length];
    const days = counts.map((trips, i) => {
      const d = new Date(`${today}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - (counts.length - 1 - i));
      return { date: d.toISOString().slice(0, 10), trips, shifts: 2 };
    });
    return { data: { days } };
  }],
];

const respond = (config, status, data) => ({ data, status, statusText: status === 200 ? 'OK' : 'Error', headers: {}, config, request: {} });

export function mockAdapter(config) {
  const method = String(config.method || 'GET').toUpperCase();
  const path = String(config.url || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/?api(?=\/)/, '').split('?')[0];
  const normalized = path.startsWith('/') ? path : `/${path}`;
  for (const [m, pattern, handler] of HANDLERS) {
    const match = m === method && normalized.match(pattern);
    if (match) return Promise.resolve(respond(config, 200, handler(match, config)));
  }
  if (method === 'GET') return Promise.resolve(respond(config, 200, { data: [] }));
  return Promise.resolve(respond(config, 200, { data: {}, message: 'Preview mode: nothing was saved.' }));
}

export function installMockApi(instance) {
  instance.defaults.adapter = mockAdapter;
  console.info('[preview] VITE_MOCK_API=true: API calls are answered with sample data. Any email/password signs in as Operator.');
}
