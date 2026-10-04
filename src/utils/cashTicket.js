// Batch 27, Task 2: helpers for the Chauffeur's Manual Cash Ticket.
// Pure functions so the rules can be tested without rendering the screen.
// The server stays the authority: it computes the fare and refuses a full bus.
// These only decide what the pickers offer and when to disable the button.
import { isServedOnService } from './serviceType';

/** Stops a bus really stops at. Pass-through points are never boarding or drop-off choices. */
export const isStoppingType = (routeStop) => String(routeStop?.stop_type ?? 'stop') !== 'pass_through';

const stopId = (routeStop) => Number(routeStop?.stop_id ?? routeStop?.stop?.stop_id);

/**
 * Route stops in the order the bus travels them: ascending on an outbound leg,
 * descending on a reverse leg (leg_direction 'reverse'). Stopping types only; on an
 * express trip only the stops it serves (the server enforces the same rule).
 */
export function orderedStopsForLeg(routeStops, legDirection, serviceType = 'regular') {
  const list = Array.isArray(routeStops) ? routeStops.filter((s) => isServedOnService(s, serviceType)) : [];
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

/**
 * Batch 27 Part 2, Task 5: the server's one definition of "occupied" (tickets sold) comes in the occupancy
 * payload as `capacity_summary`. Use it as is; fall back to the local count only when it is missing.
 */
export function capacityFromServer(summary, fallback = {}) {
  if (!summary || typeof summary !== 'object' || !summary.capacity) return capacitySummary(fallback);
  const cap = Math.max(0, Number(summary.capacity?.total) || 0);
  return {
    capacity: cap,
    sold: Math.max(0, Number(summary.sold?.total) || 0),
    onboard: Math.max(0, Number(summary.onboard?.total) || 0),
    isFull: summary.is_full === true,
    remaining: cap > 0 ? Math.max(0, Number(summary.remaining?.total) || 0) : null,
  };
}

/** Mid-trip boarding is offered only while the bus is under way. */
export const isMidTripBoardingAvailable = (tripStatus) => ['departed', 'in-progress'].includes(String(tripStatus ?? '').toLowerCase());

/** The three shapes the picker can be in once the server has answered. */
export function boardingPointView(response) {
  const state = response?.state ?? 'none';
  const good = state === 'good';
  return {
    good,
    state,
    message: good ? '' : (response?.message || 'The bus position is not available right now.'),
    destinations: good && Array.isArray(response?.destinations) ? response.destinations : [],
    customDropoffAvailable: good && response?.custom_dropoff?.available === true,
    distanceFromOriginKm: good ? Number(response?.boarding_point?.distance_from_origin_km ?? 0) : null,
    alongLegM: good && Number.isFinite(Number(response?.boarding_point?.distance_along_leg_m)) ? Number(response.boarding_point.distance_along_leg_m) : null,
  };
}

/** Whether the cash form has everything the server needs. The fare is never part of it. */
export function isOnsiteFormComplete(form, view) {
  const boardingOk = form?.boarding_mode === 'gps' ? Boolean(view?.good) : Boolean(form?.origin_stop_id);
  const destinationOk = Boolean(form?.dropoff) || Boolean(form?.destination_stop_id);
  return boardingOk && destinationOk;
}

/**
 * The checkout item. In bus-position mode the client names no boarding point at all (no stop, no coordinates):
 * the server resolves it from the bus's own position. A pinned drop-off sends only the pin; the server
 * validates, snaps and prices it.
 */
export function buildOnsiteItem({ tripId, form }) {
  const item = { trip_id: Number(tripId), seat_type: form.seat_type };
  if (form.boarding_mode === 'gps') item.boarding_mode = 'gps';
  else item.origin_stop_id = Number(form.origin_stop_id);

  if (form.dropoff && form.dropoff.pointId != null) {
    // A designated drop-off point is named by id only; the server knows where it is.
    item.alighting_point_id = Number(form.dropoff.pointId);
  } else if (form.dropoff) {
    item.destination_lat = Number(form.dropoff.lat);
    item.destination_lng = Number(form.dropoff.lng);
    if (form.dropoff.label) item.destination_label = String(form.dropoff.label).slice(0, 255);
  } else {
    item.destination_stop_id = Number(form.destination_stop_id);
  }
  return item;
}
