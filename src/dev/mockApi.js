// 2026-11-13: UI preview mode. With VITE_MOCK_API=true in .env.local (dev server only), every API call is answered
// here with sample data instead of going to the backend, so the Operator pages can be designed without Docker,
// a database or the emailed sign-in code. Any email and password signs in as an Operator. Nothing is saved:
// writes answer "ok" and change nothing. A production build never includes this file (see services/api.js).
// 2026-11-18: the passenger side too — the passenger login page signs in as a sample passenger, and trips can be
// searched, booked and "paid" (see "Passenger booking" below).

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

// 2026-11-18: the service region, so the homepage's "Provinces we serve" shows in preview too (it hides itself
// when the region has no provinces). Same shape as the server's GET /region.
const REGION = {
  name: 'Davao Region',
  center: { lat: 7.0731, lng: 125.6128 },
  bbox: { min_lat: 5.4, max_lat: 8.0, min_lng: 125.0, max_lng: 126.6 },
  nearby_radius_km: 5,
  provinces: {
    'Davao de Oro': ['Compostela', 'Laak', 'Mabini', 'Maco', 'Maragusan', 'Mawab', 'Monkayo', 'Montevista', 'Nabunturan', 'New Bataan', 'Pantukan'],
    'Davao del Norte': ['Asuncion', 'Braulio E. Dujali', 'Carmen', 'Kapalong', 'New Corella', 'Panabo', 'Samal', 'San Isidro', 'Santo Tomas', 'Tagum', 'Talaingod'],
    'Davao del Sur': ['Bansalan', 'Digos', 'Hagonoy', 'Kiblawan', 'Magsaysay', 'Malalag', 'Matanao', 'Padada', 'Santa Cruz', 'Sulop'],
    'Davao Occidental': ['Don Marcelino', 'Jose Abad Santos', 'Malita', 'Santa Maria', 'Sarangani'],
    'Davao Oriental': ['Baganga', 'Banaybanay', 'Boston', 'Caraga', 'Cateel', 'Governor Generoso', 'Lupon', 'Manay', 'Mati', 'San Isidro', 'Tarragona'],
    'Davao City': ['Davao City'],
  },
};

// ─── Passenger booking (2026-11-18) ──────────────────────────────────────────────────────────────────────────────
// Enough of the passenger side to search, open a trip, book a seat and "pay": trips run every hour from 05:00 to
// 21:00 on three routes, for today (only those not gone yet) and the next 30 days. Checkout opens
// /checkout/success in a new tab, which answers "paid" at once; the booking tab then shows the ticket and its QR,
// and the ticket also appears under My Tickets. Bought tickets are kept in this browser's localStorage.
const PASSENGER = {
  id: 9, name: 'Juan Dela Cruz', email: 'passenger@smarttransit.com', role: 'passenger',
  phone: '+639171234567', reward_points: 20, email_verified_at: new Date().toISOString(),
};

const P_STOPS = [
  { stop_id: 1, stop_code: 'ecoland-terminal', name: 'Ecoland Terminal', municipality: 'Davao City', province: 'Davao City' },
  { stop_id: 2, stop_code: 'toril', name: 'Toril', municipality: 'Davao City', province: 'Davao City' },
  { stop_id: 3, stop_code: 'digos-terminal', name: 'Digos City Terminal', municipality: 'Digos', province: 'Davao del Sur' },
  { stop_id: 4, stop_code: 'panabo', name: 'Panabo', municipality: 'Panabo', province: 'Davao del Norte' },
  { stop_id: 5, stop_code: 'tagum-terminal', name: 'Tagum City Terminal', municipality: 'Tagum', province: 'Davao del Norte' },
  { stop_id: 6, stop_code: 'mati-terminal', name: 'Mati City Terminal', municipality: 'Mati', province: 'Davao Oriental' },
];
// Each route is its stops in order with the minutes from the first stop; fare = 15 + 2.2 per 10 min (aircon +20%).
const P_ROUTES = [
  { route_id: 1, label: 'Davao City - Digos', stops: [[1, 0], [2, 35], [3, 95]] },
  { route_id: 2, label: 'Davao City - Tagum', stops: [[1, 0], [4, 40], [5, 80]] },
  { route_id: 3, label: 'Davao City - Mati', stops: [[1, 0], [4, 40], [5, 80], [6, 230]] },
];
const P_HOURS = Array.from({ length: 17 }, (_, i) => 5 + i); // 05:00 .. 21:00
const stopById = (id) => P_STOPS.find((s) => String(s.stop_id) === String(id));
const stopByCode = (code) => P_STOPS.find((s) => s.stop_code === code);
const stopRef = (s) => ({ stop_id: s.stop_id, stop_code: s.stop_code, name: s.name });
const pad = (n) => String(n).padStart(2, '0');
const hhmm = (minutes) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
const addDays = (date, days) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const manilaMinutesNow = () => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date()).map((p) => [p.type, p.value]));
  return (Number(parts.hour) % 24) * 60 + Number(parts.minute);
};
const fareFor = (minutes, vehicleClass) => Math.round((15 + (minutes / 10) * 2.2) * (vehicleClass === 'aircon' ? 1.2 : 1));
const LAST_DATE = addDays(today, 30);

// A trip id carries its date, route and hour (2026-11-18, route 2, 07:00 -> 202611180207), so any page can look it up.
const tripIdOf = (date, routeId, hour) => Number(`${date.replaceAll('-', '')}${pad(routeId)}${pad(hour)}`);
const decodeTripId = (id) => {
  const s = String(id);
  if (s.length !== 12) return null;
  return { date: `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`, routeId: Number(s.slice(8, 10)), hour: Number(s.slice(10, 12)) };
};
const busFor = (routeId, hour) => ({ bus_label: `DVO ${pad(routeId)}${pad(hour)} - ${hour % 2 ? 'NBC' : 'DMS'}`, vehicle_class: hour % 2 ? 'aircon' : 'ordinary' });

/** One departure for a journey (from -> to on the route), or null if the route does not run that way. */
function journeyTrip(route, date, hour, fromId, toId) {
  const from = route.stops.find(([id]) => String(id) === String(fromId));
  const to = route.stops.find(([id]) => String(id) === String(toId));
  if (!from || !to || from[1] >= to[1]) return null;
  const start = hour * 60 + from[1];
  const minutes = to[1] - from[1];
  const { bus_label, vehicle_class } = busFor(route.route_id, hour);
  return {
    trip_id: tripIdOf(date, route.route_id, hour), trip_date: date, route_id: route.route_id,
    boarding_time: hhmm(start), departure_time: hhmm(hour * 60), arrival_time: hhmm(start + minutes), duration_minutes: minutes,
    bus_label, vehicle_class, vehicle_class_label: vehicle_class === 'aircon' ? 'Aircon' : 'Non-aircon',
    seats_left: 8 + ((hour * 7 + route.route_id * 3) % 30), fare: fareFor(minutes, vehicle_class),
    origin: stopRef(stopById(fromId)), destination: stopRef(stopById(toId)),
  };
}

/** Every departure of a date, for one journey or (without one) each route end to end. Today skips buses already gone. */
function tripsOn(date, fromId = null, toId = null) {
  const cutoff = date === today ? manilaMinutesNow() : -1;
  const out = [];
  for (const hour of P_HOURS) {
    for (const route of P_ROUTES) {
      const a = fromId ?? route.stops[0][0];
      const b = toId ?? route.stops[route.stops.length - 1][0];
      const trip = journeyTrip(route, date, hour, a, b);
      if (!trip) continue;
      const [h, m] = trip.boarding_time.split(':').map(Number);
      if (h * 60 + m > cutoff) out.push(trip);
    }
  }
  return out;
}

function stopGroups(stops) {
  const groups = new Map();
  for (const s of stops) {
    if (!groups.has(s.municipality)) groups.set(s.municipality, { municipality: s.municipality, provinces: [s.province], stops: [] });
    groups.get(s.municipality).stops.push({ ...stopRef(s), route_ids: P_ROUTES.filter((r) => r.stops.some(([id]) => id === s.stop_id)).map((r) => r.route_id) });
  }
  return [...groups.values()];
}

/** The stops reachable after `originId` on any route. */
const destinationsFrom = (originId) => P_STOPS.filter((s) => P_ROUTES.some((r) => {
  const a = r.stops.findIndex(([id]) => String(id) === String(originId));
  const b = r.stops.findIndex(([id]) => id === s.stop_id);
  return a >= 0 && b > a;
}));

function timelineFor(tripId, params) {
  const decoded = decodeTripId(tripId);
  const route = P_ROUTES.find((r) => r.route_id === decoded?.routeId);
  if (!route) return null;
  const boardingId = Number(params?.boarding_stop_id) || route.stops[0][0];
  const alightingId = Number(params?.alighting_stop_id) || route.stops[route.stops.length - 1][0];
  const trip = journeyTrip(route, decoded.date, decoded.hour, boardingId, alightingId);
  if (!trip) return null;
  const bIndex = route.stops.findIndex(([id]) => id === boardingId);
  const aIndex = route.stops.findIndex(([id]) => id === alightingId);
  const last = stopById(route.stops[route.stops.length - 1][0]);
  return {
    trip: { trip_id: trip.trip_id, departure_time: trip.departure_time, route_id: route.route_id, leg_direction: 'outbound' },
    bus: { label: trip.bus_label, class: trip.vehicle_class, class_label: trip.vehicle_class_label },
    header: { bound_for: last.name, via: route.stops.slice(1, -1).map(([id]) => stopById(id).name), duration_minutes: trip.duration_minutes, stops_between: Math.max(0, aIndex - bIndex - 1), distance_km: Math.round(trip.duration_minutes * 0.6) },
    journey: { boarding_stop_id: boardingId, alighting_stop_id: alightingId, custom_dropoff: false },
    allow_custom_dropoff: false,
    collapse_min_stops: 3,
    fare: { amount: trip.fare, currency: 'PHP' },
    stops: route.stops.map(([id, offset], i) => ({
      stop_id: id, name: stopById(id).name, municipality: stopById(id).municipality, type: 'stop', custom: false,
      is_boarding: i === bIndex, is_alighting: i === aIndex, in_journey: i >= bIndex && i <= aIndex, selectable: i > bIndex,
      progress: 'upcoming', eta: `${decoded.date}T${hhmm(decoded.hour * 60 + offset)}:00+08:00`, eta_time: hhmm(decoded.hour * 60 + offset),
      eta_source: 'scheduled', distance_km: Math.round(offset * 0.6),
    })),
  };
}

// Bought tickets, kept in localStorage so they survive a reload and show under My Tickets.
const TICKETS_KEY = 'mock_passenger_tickets';
const readTickets = () => { try { return JSON.parse(localStorage.getItem(TICKETS_KEY) || '[]'); } catch { return []; } };
const writeTickets = (rows) => { try { localStorage.setItem(TICKETS_KEY, JSON.stringify(rows)); } catch { /* preview only */ } };
const bodyOf = (config) => {
  if (!config?.data) return {};
  if (typeof config.data === 'string') { try { return JSON.parse(config.data); } catch { return {}; } }
  return config.data;
};

function checkout(config) {
  const body = bodyOf(config);
  const items = Array.isArray(body.items) && body.items.length ? body.items : [];
  const paymentId = Date.now() % 1000000;
  const reference = `MOCK-${paymentId}`;
  const created = items.map((item, i) => {
    const decoded = decodeTripId(item.trip_id);
    const route = P_ROUTES.find((r) => r.route_id === decoded?.routeId);
    const trip = route && journeyTrip(route, decoded.date, decoded.hour, item.origin_stop_id, item.destination_stop_id);
    const uuid = `${reference.toLowerCase()}-${i + 1}-${Math.random().toString(16).slice(2, 10)}`;
    return {
      ticket_id: paymentId * 10 + i, ticket_uuid: uuid, payment_id: paymentId, status: 'valid', seat_type: item.seat_type || 'seated',
      amount: trip?.fare ?? 0, trip_id: item.trip_id, trip_date: decoded?.date ?? today, departure_time: trip?.boarding_time ?? null,
      origin_stop: { stop_id: trip?.origin.stop_id, stop_name: trip?.origin.name }, destination_stop: { stop_id: trip?.destination.stop_id, stop_name: trip?.destination.name },
      bus_label: trip?.bus_label ?? null, valid_from: `${decoded?.date ?? today}T00:00:00+08:00`, expires_at: `${decoded?.date ?? today}T23:59:00+08:00`,
      tracking_code: `TRK${String(paymentId).slice(-4)}${i + 1}`, payment: { payment_id: paymentId, transaction_reference: reference, status: 'paid' },
      created_at: new Date().toISOString(),
    };
  });
  writeTickets([...created, ...readTickets()]);
  return {
    data: {
      checkout_url: `${window.location.origin}/checkout/success?ref=${encodeURIComponent(reference)}`,
      payment: { payment_id: paymentId, transaction_reference: reference, amount: created.reduce((sum, t) => sum + t.amount, 0), status: 'pending' },
    },
  };
}

const PASSENGER_HANDLERS = [
  ['GET', /^\/passengers\/profile$/, () => ({ data: PASSENGER })],
  ['GET', /^\/booking\/window$/, () => ({ data: { today, max_advance_days: 30, last_bookable_date: LAST_DATE } })],
  ['GET', /^\/booking\/stops$/, (_, config) => {
    const origin = config?.params?.origin_stop_id;
    return { data: {
      meta: { today, max_advance_days: 30, home_preview_limit: 5, trips_per_page: 6, max_seats_per_purchase: 8,
        bus_types: [{ key: 'ordinary', label: 'Non-aircon' }, { key: 'aircon', label: 'Aircon' }] },
      groups: stopGroups(origin ? destinationsFrom(origin) : P_STOPS),
    } };
  }],
  ['GET', /^\/booking\/link$/, (_, config) => {
    const p = config?.params ?? {};
    const from = stopByCode(p.from);
    const to = stopByCode(p.to);
    if (!from || !to) return { data: null };
    return { data: { from: stopRef(from), to: stopRef(to), date: p.date || today } };
  }],
  ['GET', /^\/booking\/trips$/, (_, config) => {
    const p = config?.params ?? {};
    const from = p.from ? stopByCode(p.from) : null;
    const to = p.to ? stopByCode(p.to) : null;
    const date = p.date || today;
    const all = tripsOn(date, from?.stop_id ?? null, to?.stop_id ?? null);
    const perPage = Number(p.per_page) || 6;
    const page = Math.max(1, Number(p.page) || 1);
    return { data: {
      date, trips: all.slice((page - 1) * perPage, page * perPage), page, per_page: perPage, total: all.length,
      last_page: Math.max(1, Math.ceil(all.length / perPage)), next_available_date: all.length ? null : addDays(date, 1),
      message: null, from: from ? stopRef(from) : null, to: to ? stopRef(to) : null,
    } };
  }],
  ['GET', /^\/booking\/departures$/, (_, config) => {
    const p = config?.params ?? {};
    const departures = tripsOn(p.date || today, p.origin_stop_id, p.destination_stop_id);
    return { data: { departures, message: departures.length ? null : 'No more trips on this day for this journey.' } };
  }],
  ['GET', /^\/booking\/resolve$/, (_, config) => {
    const p = config?.params ?? {};
    const trip = tripsOn(p.date || today, p.origin_stop_id, p.destination_stop_id)[0] ?? null;
    return { data: { trip, message: trip ? null : 'No more trips today for this journey.' } };
  }],
  ['GET', /^\/trips\/(\d+)\/timeline$/, ([, id], config) => ({ data: timelineFor(id, config?.params) })],
  ['POST', /^\/(passengers\/)?checkout$/, (_, config) => checkout(config)],
  ['GET', /^\/payments\/status$/, () => ({ data: { status: 'paid' } })],
  ['GET', /^\/tickets\/lookup$/, (_, config) => {
    const ref = config?.params?.transaction_reference;
    return { data: readTickets().filter((t) => !ref || t.payment.transaction_reference === ref) };
  }],
  ['GET', /^\/passengers\/tickets\/([^/]+)\/qr$/, ([, uuid]) => {
    const ticket = readTickets().find((t) => t.ticket_uuid === uuid);
    return { data: ticket ? { ticket_uuid: uuid, qr_content: `SMARTTRANSIT:${uuid}`, valid_from: ticket.valid_from, expires_at: ticket.expires_at, status: 'valid' } : null };
  }],
  ['GET', /^\/passengers\/tickets$/, () => {
    const rows = readTickets();
    return { data: rows, meta: { current_page: 1, last_page: 1, per_page: rows.length || 10, total: rows.length } };
  }],
  ['GET', /^\/passengers\/dashboard-summary$/, () => {
    const rows = readTickets();
    const payments = [...new Map(rows.map((t) => [t.payment_id, {
      payment_id: t.payment_id, transaction_reference: t.payment.transaction_reference, status: 'paid', created_at: t.created_at,
      amount: rows.filter((r) => r.payment_id === t.payment_id).reduce((sum, r) => sum + r.amount, 0),
    }])).values()];
    return { data: { profile: PASSENGER, tickets: rows, rewards: [], payments } };
  }],
];

const staffRow = (p, role) => ({ company_user_id: p.id, user_id: p.id, name: p.name, username: p.user.username, role, is_active: true });

/** [method, url pattern, handler(match, config) => body]. First match wins; unmatched GETs answer an empty list. */
const HANDLERS = [
  // The passenger login page sends portal=passenger; anything else signs in as the Operator.
  ['POST', /^\/auth\/login$/, (_, config) => (bodyOf(config).portal === 'passenger'
    ? { data: { otp_required: false, token: 'preview-passenger-token', user: { ...PASSENGER } } }
    : { data: { otp_required: false, token: 'preview-token', user: { ...PROFILE } } })],
  ...PASSENGER_HANDLERS,
  ['GET', /^\/(operator|staff)\/profile$/, () => ({ data: PROFILE })],
  ['GET', /^\/region$/, () => ({ data: REGION })],
  // "Are you in {place}?" on the homepage: the preview always answers Davao City.
  ['GET', /^\/region\/place$/, () => ({ data: { place: 'Davao City', province: 'Davao City' } })],
  // Batch 81: the dashboard's On-time trips (SAMPLE figures for the preview).
  ['GET', /^\/operator\/dashboard\/on-time$/, () => ({ data: { grace_minutes: 5, today: { date: today, departed: 25, on_time: 22, percent: 88 }, last_week: { date: today, departed: 24, on_time: 20, percent: 83 } } })],
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
