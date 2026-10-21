import { getBusinessToday } from './dates';
import { OPEN_STATUSES } from './operatorDashboardView';

/**
 * Batch 31 Phase 4: what the Operator's Routes pages show for each route, computed from the route payload
 * (route_stops with their stop) and the fleets and trips the portal already loads.
 *
 * The `routes` table has no status, distance, duration or municipality column, so none is invented:
 *   - municipalities come from the stops on the route (stops.municipality)
 *   - distance is the last stop's distance_from_origin_km, duration the largest scheduled_offset_min; both are blank
 *     until stops carry them
 *   - status is "Active" when at least one active fleet is assigned to the route (an active fleets_routes row on an
 *     active fleet), otherwise "No active fleet"
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

export function activeFleetsOnRoute(routeId, fleets = []) {
  return fleets
    .filter((fleet) => String(fleet?.status || 'active').toLowerCase() === 'active')
    .filter((fleet) => (fleet.fleet_routes || []).some((link) => Number(link?.route_id) === Number(routeId) && String(link?.status || 'active').toLowerCase() === 'active'))
    .map((fleet) => ({ fleetId: Number(fleet.fleet_id), plate: fleet.plate_number }));
}

export function buildRouteRows({ routes = [], fleets = [] } = {}) {
  return routes.map((route) => {
    const stops = sortedRouteStops(route);
    const last = stops[stops.length - 1];
    const municipalities = [...new Set(stops.map((row) => row?.stop?.municipality).filter(Boolean))];
    const offsets = stops.map((row) => numberOrNull(row?.scheduled_offset_min)).filter((n) => n !== null);
    const fleetsOnRoute = activeFleetsOnRoute(route.route_id, fleets);
    return {
      route,
      routeId: Number(route.route_id),
      stopCount: stops.length,
      municipalities,
      distanceKm: numberOrNull(last?.distance_from_origin_km),
      durationMin: offsets.length ? Math.max(...offsets) : null,
      activeFleets: fleetsOnRoute,
      status: fleetsOnRoute.length > 0 ? { key: 'active', label: 'Active', tone: 'success' } : { key: 'no_fleet', label: 'No active fleet', tone: 'neutral' },
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
    const text = [stop.stop_name, stop.stop_code, stop.location, stop.municipality].map((part) => String(part || '').toLowerCase()).join(' ');
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
    peakHour: peak ? { hour: peak[0], trips: peak[1] } : null,
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
      start: String(link.start_time || '').slice(0, 5) || null,
      end: String(link.end_time || '').slice(0, 5) || null,
      active: String(link.status || 'active').toLowerCase() === 'active' && String(fleet.status || 'active').toLowerCase() === 'active',
    })));
}
