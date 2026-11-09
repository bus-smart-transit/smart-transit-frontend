// Batch 51 items 2 and 3 (user, 2026-11-09): on the homepage, with the passenger's permission, the trip list starts at
// the nearest stop within the region's radius (5 km). The distance is measured on this device; the position itself is
// never sent for it (only a 1 km rounded point goes to the server, for "Are you in {place}?").

import { haversineM } from './geo';

/**
 * The nearest stop with a position within radiusKm of coords, from the booking stop groups, or null.
 * @returns {{ stop: object, meters: number }|null}
 */
export function nearestStop(groups = [], coords = null, radiusKm = 5) {
  if (!coords || !Number.isFinite(Number(coords.lat)) || !Number.isFinite(Number(coords.lng))) return null;
  let best = null;
  groups.flatMap((group) => group?.stops || []).forEach((stop) => {
    const lat = Number(stop?.latitude);
    const lng = Number(stop?.longitude);
    if (stop?.latitude == null || stop?.longitude == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const meters = haversineM(Number(coords.lat), Number(coords.lng), lat, lng);
    if (Number.isFinite(meters) && meters <= radiusKm * 1000 && (!best || meters < best.meters)) best = { stop, meters };
  });
  return best;
}

/** The question the homepage asks: the town when the server knows it, else the nearest stop, else nothing. */
export function locationQuestion(place, nearest) {
  if (place?.place) return `Are you in ${place.place}?`;
  if (nearest?.stop?.name) return `Are you near ${nearest.stop.name}?`;
  return '';
}
