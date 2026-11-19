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
