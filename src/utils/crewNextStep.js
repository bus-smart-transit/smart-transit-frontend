// Batch 61 (advisor, via the user, 2026-11-13): the crew Home shows ONE big button: the next thing to do. These pure
// functions decide which step that is, from the same facts the old buttons used. The server still checks every action;
// a step that cannot be done yet is shown disabled with the reason, never hidden.
//
// Each step: { key, title, label, hint, disabled, reason }. `label` null means there is nothing to press (only news).

const norm = (value) => String(value || '').toLowerCase();
const NOT_LEFT = ['scheduled', 'delayed'];
const RUNNING = ['departed', 'in-progress'];

function common({ hasWork, forApproval, needsAcceptance, isPaired, partner }) {
  if (!hasWork) return { key: 'none', title: 'No trip today', label: null, hint: 'You have no trip to run today.' };
  if (forApproval) {
    return { key: 'waiting', title: 'Waiting for your Operator', label: null, hint: 'You asked to be released from this trip. Your Operator has not decided yet.' };
  }
  if (needsAcceptance) {
    return { key: 'accept', title: 'Accept your trip', label: 'Open my trips', hint: 'Your Operator gave you a trip. Accept it on the Schedule page first.' };
  }
  if (!isPaired) {
    return { key: 'pair', title: 'Pair with your crew', label: 'Pair with crew', hint: `Pair with your ${partner} before you start.` };
  }
  return null;
}

/** The Driver's next step. */
export function driverNextStep({
  hasWork, forApproval = false, needsAcceptance = false, isPaired, hasOpenShift, showEndShift = false, endBlockedReason = '',
  tripStatus, boardingGate = { open: true, label: '' }, departGate = { open: true, label: '' }, finalStopDone = false,
  nextStopName = null, nextStopId = null, inFlight = false,
}) {
  const early = common({ hasWork, forApproval, needsAcceptance, isPaired, partner: 'Chauffeur' });
  if (early) return early;
  if (!hasOpenShift) return { key: 'startShift', title: 'Start your shift', label: 'Start shift', hint: 'Start your shift when you are at the bus.', disabled: inFlight };
  if (showEndShift) {
    return { key: 'endShift', title: 'Your shift', label: 'End shift', hint: 'All your trips are done. End your shift.', disabled: inFlight || Boolean(endBlockedReason), reason: endBlockedReason || '' };
  }
  const status = norm(tripStatus);
  if (NOT_LEFT.includes(status)) {
    return { key: 'boarding', title: 'Let passengers on', label: 'Start boarding', hint: 'Open the door for passengers.', disabled: inFlight || !boardingGate.open, reason: boardingGate.open ? '' : boardingGate.label };
  }
  if (status === 'boarding') {
    return { key: 'depart', title: 'Leave the terminal', label: 'Depart', hint: 'Leave when everyone is on board.', disabled: inFlight || !departGate.open, reason: departGate.open ? '' : departGate.label };
  }
  if (RUNNING.includes(status) && !finalStopDone) {
    return {
      key: 'arrive',
      title: nextStopName ? `Next stop: ${nextStopName}` : 'Next stop',
      label: nextStopName ? `I am at ${nextStopName}` : 'I am at the stop',
      hint: 'Tap when the bus stops there.',
      disabled: inFlight || !nextStopId,
      reason: nextStopId ? '' : 'The next stop is not known yet. Open Trip to see the stops.',
    };
  }
  if (RUNNING.includes(status)) return { key: 'endTrip', title: 'Last stop reached', label: 'End trip', hint: 'End the trip now.', disabled: inFlight };
  if (status === 'completed') return { key: 'done', title: 'Trip finished', label: null, hint: 'This trip is done.' };
  return { key: 'none', title: 'Nothing to do now', label: null, hint: 'Your trip will show here when it is ready.' };
}

/** The Chauffeur's next step. Trip actions (boarding, depart, end trip) are the Driver's; the Chauffeur scans tickets. */
export function chauffeurNextStep({
  hasWork, forApproval = false, needsAcceptance = false, isPaired, hasOpenShift, hasActiveTrip, tripStatus,
  endBlockedReason = '', inFlight = false,
}) {
  const early = common({ hasWork, forApproval, needsAcceptance, isPaired, partner: 'Driver' });
  if (early) return early;
  if (!hasOpenShift) return { key: 'startShift', title: 'Start your shift', label: 'Start shift', hint: 'Start your shift when you are at the bus.', disabled: inFlight };
  const status = norm(tripStatus);
  if (hasActiveTrip && (status === 'boarding' || RUNNING.includes(status))) {
    return { key: 'tickets', title: 'Passengers are boarding', label: 'Scan tickets', hint: 'Open the scanner to check tickets and sell cash fares.' };
  }
  if (hasActiveTrip && NOT_LEFT.includes(status)) {
    return { key: 'wait', title: 'Waiting for boarding', label: null, hint: 'Ticketing opens when your Driver starts boarding.' };
  }
  return { key: 'endShift', title: 'Your shift', label: 'End shift', hint: 'All your trips are done. End your shift and hand over the cash.', disabled: inFlight || Boolean(endBlockedReason), reason: endBlockedReason || '' };
}
