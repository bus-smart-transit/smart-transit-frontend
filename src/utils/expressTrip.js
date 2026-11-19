// Batch 75 (panel, 2026-11-15): how an express trip reads on the passenger map. An express that serves only its two
// terminals is "Non-stop" (point A to point B); the stops it skips are drawn as small pass-through dots.

/** The stop ids an express trip serves (from the server's `service.served_stops`), or null for a regular trip. */
export function servedStopIdsOf(service) {
  if (service?.type !== 'express' || !Array.isArray(service.served_stops) || service.served_stops.length === 0) return null;
  return service.served_stops.map((stop) => Number(stop.stop_id));
}

/** The route's stops with every stop the trip does not serve turned into a pass-through dot. */
export function markUnservedStops(stops, servedStopIds) {
  if (!Array.isArray(stops) || !Array.isArray(servedStopIds) || servedStopIds.length === 0) return stops;
  const served = new Set(servedStopIds.map(Number));
  return stops.map((stop) => (served.has(Number(stop.stopId)) ? stop : { ...stop, type: 'pass_through' }));
}

/**
 * "{first stop} → {last stop}", with " · Non-stop" for an express that serves only its terminals and
 * " · Express, stops at {stop}" when it serves stops in between. Null when the start or the destination is unknown.
 */
export function journeyLabel(progress) {
  const origin = progress?.origin;
  const destination = progress?.destination;
  if (!origin || !destination) return null;
  const base = `${origin} → ${destination}`;
  const service = progress?.service;
  if (service?.type !== 'express') return base;
  if (service.non_stop) return `${base} · Non-stop`;
  const between = (service.served_stops || []).slice(1, -1).map((stop) => stop.name).filter(Boolean);
  return between.length ? `${base} · Express, stops at ${between.join(', ')}` : `${base} · Express`;
}
