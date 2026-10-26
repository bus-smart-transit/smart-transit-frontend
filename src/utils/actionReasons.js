// Batch 29, issue 2: a disabled action must say why, in plain words, next to the button (a tooltip alone never
// shows on a phone). Each function returns '' when the action is allowed, so the caller renders the line only when
// there is a reason. The rules themselves live on the server; this only explains what the screen already knows.

const PAIRING = 'Pairing is required first. Pair with your partner to continue.';
const ACCEPT = 'Accept your assignment first (Assigned Routes). Your shift and your pairing key unlock after that.';

/** The header's Start Shift / End Trip / End Shift button. */
export function shiftActionReason({ label, disabled, inFlight = false, isPaired, hasWork = true, needsAcceptance = false, tripIsLive = false, endBlockedReason = '' }) {
  if (!disabled || inFlight) return '';
  if (label === 'End Shift') return endBlockedReason || '';
  if (label === 'End Trip') {
    if (!isPaired) return PAIRING;
    return tripIsLive ? '' : 'End Trip unlocks once the trip has departed.';
  }
  if (!hasWork) return 'No open trip is assigned to you today, so there is nothing to start.';
  if (needsAcceptance) return ACCEPT;
  if (!isPaired) return PAIRING;
  return '';
}

/** The Chauffeur's Make sale / Scan Ticket pair. */
export function ticketingReason({ isPaired, hasOpenShift, hasActiveTrip, isFull = false }) {
  if (!isPaired) return PAIRING;
  if (!hasOpenShift) return 'Start your shift to issue or scan tickets.';
  if (!hasActiveTrip) return 'There is no active trip right now, so there is nothing to issue tickets for.';
  if (isFull) return 'The bus has no places left for cash tickets.';
  return '';
}

/** The Driver's Start Boarding / Depart / End Trip row. */
/**
 * Phase A (§4.11) adds the clock: `boardingLabel` / `departLabel` are opensGate() labels while that action is not yet
 * open ("Start Boarding opens at 7:30 AM"), and `finalStopDone` is false until the leg's last stop is acknowledged.
 */
export function driverTripActionReason({ isPaired, hasOpenShift, status, boardingLabel = '', departLabel = '', finalStopDone = true }) {
  const s = String(status || '').toLowerCase();
  if (!isPaired) return PAIRING;
  if (!hasOpenShift) return 'Start your shift first to board or depart.';
  if (!s) return 'There is no active trip right now.';
  if ((s === 'scheduled' || s === 'delayed') && boardingLabel) return `${boardingLabel}.`;
  if (s === 'boarding') return departLabel ? `Boarding is open. ${departLabel}.` : 'Boarding is open. Depart when the bus is ready.';
  if (s === 'departed' || s === 'in-progress') {
    return finalStopDone ? 'The trip is under way. Use End Trip when you arrive.' : 'The trip is under way. Acknowledge the final stop, then use End Trip.';
  }
  if (s === 'completed' || s === 'cancelled') return 'This trip is already finished.';
  return '';
}
