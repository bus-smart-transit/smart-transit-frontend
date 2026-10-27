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

/**
 * 2026-10-27 (§6): on a bus already on the road, the destinations the Driver has not passed yet: the stops after the
 * last acknowledged one, in leg order. Before any acknowledgement every stop is still ahead. The server refuses a
 * passed destination as well; the boarding stop may be behind the bus (a passenger who got on there pays now).
 */
export function destinationsNotPassed(destinations, orderedStops, lastAcknowledgedStopId) {
  const ack = Number(lastAcknowledgedStopId);
  if (!ack) return destinations;
  const ackIndex = orderedStops.findIndex((s) => stopId(s) === ack);
  if (ackIndex < 0) return destinations;
  const passed = new Set(orderedStops.slice(0, ackIndex + 1).map((s) => stopId(s)));
  return destinations.filter((s) => !passed.has(stopId(s)));
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
    standingOpen: false, // no per-seat-type count to go on, so standing is not offered
  };
}

/**
 * Places left of one seat type on a trip: the bus's capacity for it minus the tickets sold (trips.current_*_capacity
 * holds the SOLD count, as in the server's TripCapacity). "—" when the bus's capacity is unknown.
 */
export function placesLeft(fleet, trip, seatType) {
  const key = seatType === 'standing' ? 'standing' : 'seated';
  const raw = fleet?.[key + '_capacity'];
  if (raw == null || !Number.isFinite(Number(raw))) return '—';
  const sold = Number(trip?.['current_' + key + '_capacity']) || 0;
  return Math.max(0, Number(raw) - sold);
}

/**
 * Standing is sold only on the bus and only once every seat is sold; it is offered while standing places remain. The
 * server enforces the same rule (TripCapacity::standingOpen), so this only decides whether the option is shown.
 */
export function isStandingOpen(summary) {
  if (!summary?.capacity || !summary?.remaining) return false;
  return Number(summary.remaining.seated) <= 0 && Number(summary.remaining.standing) > 0;
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
    standingOpen: isStandingOpen(summary),
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
    distanceFromOriginKm: good ? Number(response?.boarding_point?.distance_from_origin_km ?? 0) : null,
    alongLegM: good && Number.isFinite(Number(response?.boarding_point?.distance_along_leg_m)) ? Number(response.boarding_point.distance_along_leg_m) : null,
  };
}

/** Whether the cash form has everything the server needs. The fare is never part of it. */
export function isOnsiteFormComplete(form, view) {
  const mode = form?.boarding_mode;
  const boardingOk = mode === 'gps' ? Boolean(view?.good) : mode === 'checkin' ? Boolean(form?.pending_boarding_id) : Boolean(form?.origin_stop_id);
  const destinationOk = Boolean(form?.destination_stop_id);
  return boardingOk && destinationOk;
}

/**
 * In bus-position mode the server resolves boarding (snapped back to the last stop passed); for a checked-in passenger
 * (Passenger In, 2026-10-26) the server uses the stop kept at check-in. The client never sends a position.
 */
export function buildOnsiteItem({ tripId, form }) {
  const item = { trip_id: Number(tripId), seat_type: form.seat_type };
  if (form.boarding_mode === 'gps') item.boarding_mode = 'gps';
  else if (form.boarding_mode === 'checkin') item.pending_boarding_id = Number(form.pending_boarding_id);
  else item.origin_stop_id = Number(form.origin_stop_id);
  item.destination_stop_id = Number(form.destination_stop_id);
  return item;
}

/** "10:42 · after Stop B" for a check-in waiting for its fare (Passenger In). */
export function checkInLabel(checkIn) {
  if (!checkIn) return '';
  return `${checkIn.checked_in_at || '--:--'} · after ${checkIn.stop_name || 'Not provided'}`;
}
