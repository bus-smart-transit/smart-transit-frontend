import { clock12 } from './clock';
import { routeColorMap } from './routeColors';
// 2026-11-08 (user): view logic of the public Track Bus map. A bus that has not departed is "waiting" at its first
// stop (the server decides which, WaitingBusService); the map draws the route line of every bus so no icon floats.

/** How many buses are on the road (live) and how many wait to leave. */
export function busCounts(rows = []) {
  const waiting = rows.filter((row) => row?.waiting).length;
  return { live: rows.length - waiting, waiting };
}

/** The short status line under a bus's name. trip is busTrip(row.trip_progress). */
export function busStatusText(row, trip = {}) {
  if (row?.waiting) {
    const where = row.waiting_at ? `Waiting at ${row.waiting_at}` : 'Waiting to leave';
    if (!row.departs_at) return where;
    return String(row.trip_status || '').toLowerCase() === 'delayed'
      ? `${where} · running late (was due ${clock12(row.departs_at) || row.departs_at})`
      : `${where} · leaves ${clock12(row.departs_at) || row.departs_at}`;
  }
  if (trip.arrived) return 'Arrived';
  if (trip.departedAt) return `Departed at ${trip.departedAt}`;
  const status = String(row?.trip_status || 'active');
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** The key of a bus's route line: the route and its leg direction. */
export const routeKeyOf = (row) => `${Number(row?.route_id)}:${row?.leg_direction === 'reverse' ? 'reverse' : 'outbound'}`;

/**
 * GeoJSON features for the route line of every listed bus, once per route and direction. geometryByKey maps
 * routeKeyOf() to a LineString geometry; a route without a stored line is left out (never drawn from guesses).
 * Batch 81 (user, 2026-11-19): each route in its own colour (utils/routeColors, the same as the Operator dashboard).
 */
export function routeLineFeatures(rows = [], geometryByKey = {}) {
  const colors = routeColorMap(rows.map((row) => row?.route_id));
  const seen = new Set();
  const features = [];
  rows.forEach((row) => {
    if (!(Number(row?.route_id) > 0)) return;
    const key = routeKeyOf(row);
    const coordinates = geometryByKey[key]?.coordinates;
    if (seen.has(key) || !Array.isArray(coordinates) || coordinates.length < 2) return;
    seen.add(key);
    features.push({ type: 'Feature', properties: { key, color: colors.get(Number(row.route_id))?.color }, geometry: { type: 'LineString', coordinates } });
  });
  return features;
}

/**
 * Batch 75 (user, 2026-11-15): one pin per passenger place (the grouped booking stop list, so a place listed twice in
 * the data shows once). A place without a position is left out.
 */
export function stopPlaceFeatures(groups = []) {
  return (groups || []).flatMap((group) => (group?.stops || []))
    .filter((stop) => stop?.latitude != null && stop?.longitude != null && Number.isFinite(Number(stop.latitude)) && Number.isFinite(Number(stop.longitude)) && stop?.stop_code)
    .map((stop) => ({
      type: 'Feature',
      properties: { code: stop.stop_code, name: stop.name || 'Not provided' },
      geometry: { type: 'Point', coordinates: [Number(stop.longitude), Number(stop.latitude)] },
    }));
}

/** Available trips leaving from a place (the same address the homepage search opens). */
export const tripsFromStopHref = (stopCode) => `/passenger/trips?from=${encodeURIComponent(stopCode)}`;
