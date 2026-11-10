// Batch 54 (user, 2026-11-10): "View route stops" on a trip card in All available trips. Rows come from the server's
// trip timeline asked for the card's boarding stop; nothing is worked out here except how a row reads.

/**
 * One row per real stop (a custom drop-off pin is not listed), in the order the bus reaches them.
 * time: the live or timetable time, or '' when the server has none (shown as Not provided).
 * choosable: a stop after the boarding stop where the bus stops and which has a code to book with.
 */
export function routeStopRows(stops = []) {
  const boardIndex = stops.findIndex((stop) => stop?.is_boarding);
  return stops
    .filter((stop) => stop && !stop.custom)
    .map((stop, index) => ({
      key: String(stop.stop_id ?? `${stop.name}-${index}`),
      name: stop.name || 'Not provided',
      code: stop.stop_code || '',
      time: stop.eta_time || stop.scheduled_time || '',
      passesOnly: stop.type === 'pass_through',
      boarding: Boolean(stop.is_boarding),
      before: boardIndex >= 0 && index < boardIndex,
      choosable: Boolean(stop.selectable && stop.stop_code),
    }));
}
