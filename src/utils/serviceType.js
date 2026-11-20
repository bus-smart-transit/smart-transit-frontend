// Batch 28, item 3: service type regular | express belongs to the schedule (the trip).
// The server decides everything that matters (it rejects a stop an express trip skips and
// refuses to price express in Stage 1). These helpers only shape what the screens offer.
export const SERVICE_REGULAR = 'regular';
export const SERVICE_EXPRESS = 'express';
export const FARE_UNAVAILABLE = 'Fare unavailable';

export const isExpress = (serviceType) => String(serviceType ?? '').toLowerCase() === SERVICE_EXPRESS;

export const serviceTypeLabel = (serviceType) => (isExpress(serviceType) ? 'Express' : 'Regular');

/**
 * True when a passenger or conductor may use this route stop on a trip of this service.
 * Pass-through stops never are. On an express trip a stop must also be served_by_express.
 */
export function isServedOnService(routeStop, serviceType) {
  if (String(routeStop?.stop_type ?? 'stop') === 'pass_through') return false;
  return !isExpress(serviceType) || Boolean(routeStop?.served_by_express);
}

/**
 * 2026-11-20 (user): the route stops a trip of this service may use, the same rule as the server (App\Support\ServiceType
 * with ExpressStops). Regular: every stopping stop. Express: the stops the route marks "served by express"; a route that
 * marks none runs express non-stop between its own first and last stopping stop.
 */
export function servedStopsOnService(routeStops, serviceType) {
  const list = Array.isArray(routeStops) ? routeStops : [];
  const stopping = list.filter((s) => String(s?.stop_type ?? 'stop') !== 'pass_through');
  if (!isExpress(serviceType)) return stopping;
  if (list.some((s) => Boolean(s?.served_by_express))) return stopping.filter((s) => Boolean(s?.served_by_express));
  if (stopping.length === 0) return [];
  const orders = stopping.map((s) => Number(s?.stop_order ?? 0));
  const ends = [Math.min(...orders), Math.max(...orders)];
  return stopping.filter((s) => ends.includes(Number(s?.stop_order ?? 0)));
}
