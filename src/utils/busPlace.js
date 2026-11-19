import { haversineM } from './geo';

/**
 * Where a bus is, in words, from its position and the stops of its route (already ordered for the leg's
 * direction): "At <stop>", "Near <stop>", or "Between <stop> and <next stop>". It uses only the route's own stop
 * names, so it needs no address lookup and never shows raw coordinates.
 */

const AT_STOP_M = 120;
const NEAR_STOP_M = 500;
// A bus farther than this from the corridor between two consecutive stops is not described as "between" them.
const MAX_OFF_CORRIDOR_M = 2500;

// null, undefined and '' are "no value", not 0 (Number(null) is 0, which would place the bus in the ocean).
const finite = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

export function describeBusPlace(stops, latitude, longitude) {
  const points = (Array.isArray(stops) ? stops : [])
    .map((stop) => ({ name: String(stop?.name ?? stop?.stop_name ?? '').trim(), lat: Number(stop?.latitude), lng: Number(stop?.longitude) }))
    .filter((point) => point.name && Number.isFinite(point.lat) && Number.isFinite(point.lng));
  if (points.length === 0 || !finite(latitude) || !finite(longitude)) return null;

  const lat = Number(latitude);
  const lng = Number(longitude);
  const distances = points.map((point) => haversineM(lat, lng, point.lat, point.lng));
  const nearestIndex = distances.indexOf(Math.min(...distances));
  const nearest = points[nearestIndex];
  const nearestM = distances[nearestIndex];

  if (nearestM <= AT_STOP_M) return { kind: 'at', text: `At ${nearest.name}`, stopName: nearest.name };
  if (nearestM <= NEAR_STOP_M) return { kind: 'near', text: `Near ${nearest.name}`, stopName: nearest.name };

  // The pair of consecutive stops whose corridor the bus is closest to (the extra distance of going via the bus).
  let best = null;
  for (let i = 0; i < points.length - 1; i += 1) {
    const gap = haversineM(points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng);
    const excess = distances[i] + distances[i + 1] - gap;
    if (!best || excess < best.excess) best = { i, excess };
  }
  if (best && best.excess <= MAX_OFF_CORRIDOR_M) {
    const from = points[best.i].name;
    const to = points[best.i + 1].name;
    return { kind: 'between', text: `Between ${from} and ${to}`, from, to };
  }

  return { kind: 'away', text: `Away from the route (nearest stop: ${nearest.name})`, stopName: nearest.name };
}
