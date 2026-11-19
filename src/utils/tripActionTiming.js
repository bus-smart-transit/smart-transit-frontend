// Phase A (smarttransit_prompt.md §4.11): when pairing, Start Boarding and Depart open, and whether End Trip may be
// pressed. The server decides (App\Support\TripTiming, TripActionGuard); these only mirror it so a button is not
// offered before it can work. Times come from the server as ISO 8601 instants and are shown on the Manila clock,
// without a timezone label.

const MANILA = 'Asia/Manila';

const manilaParts = (date) => Object.fromEntries(
  new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA, year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  }).formatToParts(date).map((p) => [p.type, p.value]),
);

/** "7:30 AM" for an instant, or "" when it cannot be read. */
export function formatManilaClock(value) {
  const date = value instanceof Date ? value : new Date(String(value ?? ''));
  if (!value || Number.isNaN(date.getTime())) return '';
  const p = manilaParts(date);
  return `${p.hour}:${p.minute} ${p.dayPeriod}`;
}

/**
 * Whether an action that opens at `opensAt` is open at `nowMs`, and the text to show while it is not:
 * "{what} at 7:30 AM" on the same Manila day, "{what} on Oct 28 at 7:30 AM" on another. No opening time means the
 * rule cannot be read, so the action is not held back here (the server still decides).
 */
export function opensGate(opensAt, nowMs = Date.now(), what = 'Opens') {
  const opensMs = opensAt ? Date.parse(String(opensAt)) : Number.NaN;
  if (!Number.isFinite(opensMs) || nowMs >= opensMs) return { open: true, label: '' };

  const at = manilaParts(new Date(opensMs));
  const today = manilaParts(new Date(nowMs));
  const clock = `${at.hour}:${at.minute} ${at.dayPeriod}`;
  const sameDay = at.year === today.year && at.month === today.month && at.day === today.day;
  return { open: false, label: sameDay ? `${what} at ${clock}` : `${what} on ${at.month} ${at.day} at ${clock}` };
}

/** End Trip waits for the leg's last stop (travel order) to be acknowledged; a route without stops does not wait. */
export function isFinalStopAcknowledged(stops) {
  if (!Array.isArray(stops) || stops.length === 0) return true;
  return stops[stops.length - 1]?.is_acknowledged === true;
}
