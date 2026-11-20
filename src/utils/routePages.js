import { slugOf } from './provinceCards';
import { buildBookingQuery } from './bookingQuery';

/**
 * 2026-11-20 (user): links and lookups of the passengers' route pages. A province picture opens /provinces/<slug>; a
 * route opens /routes/<id>; a departure opens booking for its whole journey (first stop to last, in its direction).
 */

export const provinceHref = (name) => `/provinces/${slugOf(name)}`;

export const routeHref = (routeId) => `/routes/${encodeURIComponent(routeId)}`;

/** The province name (as the server's region settings spell it) for a page slug, or null when there is none. */
export function provinceFromSlug(slug, provinces) {
  const wanted = String(slug ?? '').toLowerCase();
  return Object.keys(provinces ?? {}).find((name) => slugOf(name) === wanted) ?? null;
}

/** The stops a bus passengers can use, in the order the departure runs (pass-throughs left out). */
export function stopsForDirection(stops, direction) {
  const usable = (Array.isArray(stops) ? stops : []).filter((stop) => String(stop?.stop_type ?? 'stop') !== 'pass_through');
  const ordered = [...usable].sort((a, b) => Number(a?.stop_order ?? 0) - Number(b?.stop_order ?? 0));
  return direction === 'reverse' ? ordered.reverse() : ordered;
}

/** Booking for a departure, from its first stop to its last; null when the stops are not known yet. */
export function departureBookingHref(departure, stops) {
  const ordered = stopsForDirection(stops, departure?.direction);
  const from = ordered[0]?.stop_code;
  const to = ordered[ordered.length - 1]?.stop_code;
  if (!from || !to || from === to) return null;
  return `/passenger/book?${buildBookingQuery({ from, to, date: departure?.trip_date, time: departure?.departure_time })}`;
}
