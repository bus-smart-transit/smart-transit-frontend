// Batch 27, Task 2: helpers for the Chauffeur's Manual Cash Ticket.
// Pure functions so the rules can be tested without rendering the screen.
// The server stays the authority: it computes the fare and refuses a full bus.
// These only decide what the pickers offer and when to disable the button.

/** Stops a bus really stops at. Pass-through points are never boarding or drop-off choices. */
export const isStoppingType = (routeStop) => String(routeStop?.stop_type ?? 'stop') !== 'pass_through';

const stopId = (routeStop) => Number(routeStop?.stop_id ?? routeStop?.stop?.stop_id);

/**
 * Route stops in the order the bus travels them: ascending on an outbound leg,
 * descending on a reverse leg (leg_direction 'reverse'). Stopping types only.
 */
export function orderedStopsForLeg(routeStops, legDirection) {
  const list = Array.isArray(routeStops) ? routeStops.filter(isStoppingType) : [];
  const sorted = [...list].sort((a, b) => Number(a?.stop_order ?? 0) - Number(b?.stop_order ?? 0));
  return String(legDirection ?? 'outbound') === 'reverse' ? sorted.reverse() : sorted;
}

/** Stops the bus reaches after the boarding stop on this leg: the valid drop-offs. */
export function destinationsAhead(orderedStops, originStopId) {
  const origin = Number(originStopId);
  if (!origin) return [];
  const index = orderedStops.findIndex((s) => stopId(s) === origin);
  return index < 0 ? [] : orderedStops.slice(index + 1);
}

export const stopLabel = (routeStop) =>
  routeStop?.stop?.stop_name || routeStop?.stop_name || `Stop ${stopId(routeStop)}`;

/**
 * Capacity as a plain count (no seat numbers): how many tickets are sold for
 * the trip (the server's own count, which is what blocks a sale), how many
 * passengers have boarded, and the bus capacity.
 */
export function capacitySummary({ capacity, sold, onboard }) {
  const cap = Math.max(0, Number(capacity) || 0);
  const soldCount = Math.max(0, Number(sold) || 0);
  const onboardCount = Math.max(0, Number(onboard) || 0);
  return {
    capacity: cap,
    sold: soldCount,
    onboard: onboardCount,
    isFull: cap > 0 && (soldCount >= cap || onboardCount >= cap),
    remaining: cap > 0 ? Math.max(0, cap - Math.max(soldCount, onboardCount)) : null,
  };
}
