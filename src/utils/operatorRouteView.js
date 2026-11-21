import { getBusinessToday } from './dates';
import { OPEN_STATUSES } from './operatorDashboardView';
import { clock12 } from './clock';

/**
 * Batch 31 Phase 4: what the Operator's Routes pages show for each route, computed from the route payload
 * (route_stops with their stop) and the fleets and trips the portal already loads.
 *
 * The `routes` table has no status, distance, duration or municipality column, so none is invented:
 *   - municipalities come from the stops on the route (stops.municipality)
 *   - distance is the last stop's distance_from_origin_km, duration the largest scheduled_offset_min; both are blank
 *     until stops carry them
 *   - 2026-11-21 (user, Dynamic Route Scheduling): a route's active buses are the buses with a trip on it today or
 *     later that is still to run; status is "Active" when there is one, otherwise "No trips scheduled"
 */

export const sortedRouteStops = (route) => [...(route?.route_stops || route?.routeStops || [])]
  .sort((a, b) => Number(a?.stop_order) - Number(b?.stop_order));

const numberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export function formatDuration(minutes) {
  const m = numberOrNull(minutes);
  if (m === null) return null;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/** The buses scheduled on this route: those with a trip on it today or later that is still to run (one row each). */
export function activeFleetsOnRoute(routeId, trips = [], today = getBusinessToday()) {
  const seen = new Map();
  upcomingTripsFor(routeId, trips, today).forEach((trip) => {
    const fleetId = Number(trip?.fleet_route?.fleet_id ?? trip?.fleet_route?.fleet?.fleet_id);
    const plate = trip?.fleet_route?.fleet?.plate_number || null;
    const key = Number.isFinite(fleetId) && fleetId > 0 ? `id:${fleetId}` : plate ? `plate:${plate}` : null;
    if (!key || seen.has(key)) return;
    seen.set(key, { fleetId: Number.isFinite(fleetId) && fleetId > 0 ? fleetId : null, plate: plate || `Bus #${fleetId}` });
  });
  return [...seen.values()];
}

export function buildRouteRows({ routes = [], trips = [], today = getBusinessToday() } = {}) {
  return routes.map((route) => {
    const stops = sortedRouteStops(route);
    const last = stops[stops.length - 1];
    const municipalities = [...new Set(stops.map((row) => row?.stop?.municipality).filter(Boolean))];
    const offsets = stops.map((row) => numberOrNull(row?.scheduled_offset_min)).filter((n) => n !== null);
    const fleetsOnRoute = activeFleetsOnRoute(route.route_id, trips, today);
    return {
      route,
      routeId: Number(route.route_id),
      stopCount: stops.length,
      municipalities,
      distanceKm: numberOrNull(last?.distance_from_origin_km),
      durationMin: offsets.length ? Math.max(...offsets) : null,
      activeFleets: fleetsOnRoute,
      status: fleetsOnRoute.length > 0 ? { key: 'active', label: 'Active', tone: 'success' } : { key: 'no_fleet', label: 'No trips scheduled', tone: 'neutral' },
      geometryIssue: Boolean(route.geometry_stale || route.geometry_error),
    };
  });
}

export function municipalityOptions(rows) {
  return [...new Set(rows.flatMap((row) => row.municipalities))].sort((a, b) => a.localeCompare(b));
}

export function filterRouteRows(rows, { query = '', municipality = '' } = {}) {
  const needle = String(query).trim().toLowerCase();
  return rows.filter((row) => {
    if (municipality && !row.municipalities.includes(municipality)) return false;
    if (!needle) return true;
    return [row.route.route_name, row.route.origin, row.route.destination].some((text) => String(text || '').toLowerCase().includes(needle));
  });
}

/** Seconds as "45 s" or "2 min 5 s". */
export function formatElapsed(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}

/** Stops whose name, code, label or municipality contain the words typed (every word must match somewhere). */
export function filterStops(stops, query = '') {
  const words = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return stops;
  return stops.filter((stop) => {
    const text = [stop.stop_name, stop.stop_code, stop.location_label, stop.location, stop.municipality].map((part) => String(part || '').toLowerCase()).join(' ');
    return words.every((word) => text.includes(word));
  });
}

/** One page of a list. The page is clamped, so a list that shrank (a delete, a new search) never shows an empty page. */
export function pageOf(rows, page = 1, pageSize = 10) {
  const size = Math.max(1, Number(pageSize) || 10);
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Number(page) || 1), pageCount);
  const start = (current - 1) * size;
  return {
    rows: rows.slice(start, start + size),
    page: current,
    pageCount,
    total,
    from: total ? start + 1 : 0,
    to: Math.min(total, start + size),
  };
}

/** What the route has carried so far. "Completion rate" is completed trips over all trips; it is NOT route adherence. */
export function routeActivity(routeId, trips = []) {
  const mine = trips.filter((trip) => Number(trip?.fleet_route?.route?.route_id ?? trip?.fleet_route?.route_id) === Number(routeId));
  const completed = mine.filter((trip) => String(trip?.status).toLowerCase() === 'completed').length;
  const counted = mine.filter((trip) => String(trip?.status).toLowerCase() !== 'cancelled');
  const sold = counted.reduce((sum, trip) => sum + Number(trip?.total_occupancy ?? 0), 0);
  const days = new Set(counted.map((trip) => String(trip?.trip_date || '').slice(0, 10)).filter(Boolean)).size;
  const hours = new Map();
  for (const trip of mine) {
    const raw = String(trip?.departure_time || '').trim();
    if (!/^\d{2}:\d{2}/.test(raw)) continue;
    const label = `${raw.slice(0, 2)}:00`;
    hours.set(label, (hours.get(label) ?? 0) + 1);
  }
  const peak = [...hours.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return {
    totalTrips: mine.length,
    completionRatePct: mine.length ? Math.round((completed / mine.length) * 100) : null,
    avgDailyTicketsSold: days ? Math.round(sold / days) : null,
    peakHour: peak ? { hour: clock12(peak[0]), trips: peak[1] } : null,
  };
}

/** Today's and later trips still to run on this route, soonest first. */
export function upcomingTripsFor(routeId, trips = [], today = getBusinessToday()) {
  return trips
    .filter((trip) => Number(trip?.fleet_route?.route?.route_id ?? trip?.fleet_route?.route_id) === Number(routeId))
    .filter((trip) => OPEN_STATUSES.includes(String(trip?.status).toLowerCase()))
    .filter((trip) => String(trip?.trip_date || '').slice(0, 10) >= today)
    .sort((a, b) => String(a.trip_date).slice(0, 10).localeCompare(String(b.trip_date).slice(0, 10)) || String(a.departure_time).localeCompare(String(b.departure_time)));
}

export function assignmentsOnRoute(routeId, fleets = []) {
  return fleets.flatMap((fleet) => (fleet.fleet_routes || [])
    .filter((link) => Number(link?.route_id) === Number(routeId))
    .map((link) => ({
      key: `${fleet.fleet_id}-${link.fleet_route_id ?? routeId}`,
      fleet,
      fleetRouteId: link.fleet_route_id ?? null,
      start: clock12(link.start_time),
      end: clock12(link.end_time),
      active: String(link.status || 'active').toLowerCase() === 'active' && String(fleet.status || 'active').toLowerCase() === 'active',
    })));
}

/**
 * 2026-11-20 (user): a new route is named from its origin and destination, "{origin} to {destination}". The server makes
 * the name (App\Support\RouteName); this is the same text, shown as a preview in the Add route form. Empty until both
 * places are typed.
 */
export function routeNameFrom(origin, destination) {
  const tidy = (place) => String(place ?? '').replace(/\s+/g, ' ').trim();
  const from = tidy(origin);
  const to = tidy(destination);
  return from && to ? `${from} to ${to}`.slice(0, 255) : '';
}

/** 2026-11-20 (user): a copy of the list with the item at `index` moved by `delta` places (Edit route's Move up / down). */
export function moveItem(list, index, delta) {
  const items = Array.isArray(list) ? [...list] : [];
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items;
  const [item] = items.splice(index, 1);
  items.splice(target, 0, item);
  return items;
}
