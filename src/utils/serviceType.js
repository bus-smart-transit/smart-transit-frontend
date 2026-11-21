// Batch 28, item 3: service type regular | express belongs to the schedule (the trip).
// The server decides everything that matters (it rejects a stop an express trip skips and
// refuses to price express in Stage 1). These helpers only shape what the screens offer.
export const SERVICE_REGULAR = 'regular';
export const SERVICE_EXPRESS = 'express';
export const FARE_UNAVAILABLE = 'Fare unavailable';

export const isExpress = (serviceType) => String(serviceType ?? '').toLowerCase() === SERVICE_EXPRESS;

// 2026-11-21 (user): express is shown as "Non-stop" (most people know the word); the stored value stays "express".
export const serviceTypeLabel = (serviceType) => (isExpress(serviceType) ? 'Non-stop' : 'Regular');

/**
 * The route stops a trip of this service may use, the same rule as the server (App\Support\ServiceType with
 * ExpressStops). Regular: every stopping stop. 2026-11-21 (user): express is "Non-stop": only the route's own first and
 * last stopping stop, whatever stops are marked.
 */
export function servedStopsOnService(routeStops, serviceType) {
  const list = Array.isArray(routeStops) ? routeStops : [];
  const stopping = list.filter((s) => String(s?.stop_type ?? 'stop') !== 'pass_through');
  if (!isExpress(serviceType)) return stopping;
  if (stopping.length === 0) return [];
  const orders = stopping.map((s) => Number(s?.stop_order ?? 0));
  const ends = [Math.min(...orders), Math.max(...orders)];
  return stopping.filter((s) => ends.includes(Number(s?.stop_order ?? 0)));
}
