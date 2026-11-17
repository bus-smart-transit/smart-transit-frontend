// Batch 76 (user, 2026-11-17): a trip leg's passenger count, for an inspector to compare with the people on the bus.
// The server's TripPassengerCount works the numbers out from paid tickets; this only gives them their words, in one place
// for the Chauffeur and the Operator. A missing count reads "Not provided" (never zero).

const ROWS = [
  ['on_board', 'On board now'],
  ['scanned_in', 'Scanned in'],
  ['got_off', 'Got off'],
  ['not_scanned', 'Not scanned yet'],
  ['missed', 'Missed'],
  ['expired', 'Expired'],
  ['tickets_sold', 'Tickets sold'],
];

/** [{ key, label, value }] for a count from the server, or [] when there is none. */
export function passengerCountRows(count) {
  if (!count || typeof count !== 'object') return [];
  return ROWS.map(([key, label]) => ({ key, label, value: Number.isFinite(Number(count[key])) ? Number(count[key]) : null }));
}

/** One line for small spaces: "On board 12 · Scanned in 15 · Sold 17". */
export function passengerCountLine(count) {
  if (!count || typeof count !== 'object') return 'Not provided';
  const n = (key) => (Number.isFinite(Number(count[key])) ? Number(count[key]) : '-');
  return `On board ${n('on_board')} · Scanned in ${n('scanned_in')} · Sold ${n('tickets_sold')}`;
}
