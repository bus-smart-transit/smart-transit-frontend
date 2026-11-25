// Batch 27, Task 2: helpers for the Chauffeur's Manual Cash Ticket.
// Pure functions so the rules can be tested without rendering the screen.
// The server stays the authority: it computes the fare and refuses a full bus.
// These only decide what the pickers offer and when to disable the button.
import { servedStopsOnService } from './serviceType';
import { normalizeContact } from './travellerContact';

/** Stops a bus really stops at. Pass-through points are never boarding or drop-off choices. */
export const isStoppingType = (routeStop) => String(routeStop?.stop_type ?? 'stop') !== 'pass_through';

const stopId = (routeStop) => Number(routeStop?.stop_id ?? routeStop?.stop?.stop_id);

/**
 * Route stops in the order the bus travels them: ascending on an outbound leg,
 * descending on a reverse leg (leg_direction 'reverse'). Stopping types only; on an
 * express trip only the stops it serves (the server enforces the same rule).
 */
export function orderedStopsForLeg(routeStops, legDirection, serviceType = 'regular') {
  const list = servedStopsOnService(routeStops, serviceType);
  const sorted = [...list].sort((a, b) => Number(a?.stop_order ?? 0) - Number(b?.stop_order ?? 0));
  return String(legDirection ?? 'outbound') === 'reverse' ? sorted.reverse() : sorted;
}

/**
 * Batch 60 item 2 (user, 2026-11-11): the boarding stops of a cash ticket. The leg's last stop is its destination:
 * nobody boards there (no stop is ahead of it), so it is never offered.
 */
export function boardingStopsForLeg(orderedStops) {
  return Array.isArray(orderedStops) ? orderedStops.slice(0, -1) : [];
}

/**
 * Batch 64 (user, 2026-11-13): the optional mobile number on a cash ticket, for the Ticket ID text. A Philippine
 * mobile as +639XXXXXXXXX (typed 09..., 639... or +639..., spaces and dashes ignored), or null (blank or not a mobile).
 */
export function cashTicketPhone(value) {
  // The one rule for a contact (utils/travellerContact.js, mirroring the server's TravellerContact); here only a mobile.
  const contact = normalizeContact(value);
  return contact && contact.startsWith('+63') ? contact : null;
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
/** 2026-11-23 (advisor): most tickets in one cash sale (the same as one online purchase). */
export const MAX_CASH_TICKETS = 20;

/**
 * How many tickets this cash sale makes: 1 to MAX_CASH_TICKETS. A checked-in passenger, a discount (one ID is checked)
 * and a priority seat are one person, so those sales are always one ticket.
 */
export function onsiteQuantity(form, extras = {}) {
  if (form?.boarding_mode === 'checkin' || extras.discount || extras.priority) return 1;
  const n = Math.floor(Number(form?.quantity));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_CASH_TICKETS);
}

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

/**
 * 2026-11-24 (user): the check-ins waiting for their fare, grouped by the stop they boarded after, in the order the
 * first one boarded. `next` is the one who has waited longest (the server lists check-ins oldest first), so
 * "Issue ticket" on a group sells to that person.
 */
export function checkInsByStop(checkIns) {
  const groups = new Map();
  (Array.isArray(checkIns) ? checkIns : []).forEach((checkIn) => {
    const key = String(checkIn?.stop_id ?? 'none');
    if (!groups.has(key)) {
      groups.set(key, { stop_id: checkIn?.stop_id ?? null, stop_name: checkIn?.stop_name || 'Not provided', count: 0, next: checkIn });
    }
    groups.get(key).count += 1;
  });
  return [...groups.values()];
}

/**
 * 2026-11-25 (user): what the Chauffeur collects for one cash sale: the fare times the tickets, plus the baggage (one
 * payment for the sale, at the size's price). `breakdown` is shown under the total when there is more than the fare.
 */
export function cashSaleTotal({ fare, quantity = 1, baggageFee = 0 }) {
  const unit = Number(fare);
  if (fare === null || fare === undefined || fare === '' || !Number.isFinite(unit)) return { total: null, breakdown: '' };
  const count = Math.max(1, Number(quantity) || 1);
  const bag = Number(baggageFee) > 0 ? Number(baggageFee) : 0;
  const total = Number((unit * count + bag).toFixed(2));
  const parts = [count > 1 ? `${count} tickets x ₱${unit.toFixed(2)}` : `Fare ₱${unit.toFixed(2)}`];
  if (bag > 0) parts.push(`baggage ₱${bag.toFixed(2)}`);
  return { total, breakdown: count > 1 || bag > 0 ? parts.join(' + ') : '' };
}
