/**
 * 2026-10-29: the homepage tracker's ETA, from where the bus is now. The server's trip timeline gives every stop's
 * expected time (the schedule moved by how late or early the bus was at the last stop the Driver passed, with any
 * peak-hour time) and its progress (passed, current, upcoming). This picks out:
 *
 *  - next: the stop the bus is heading to now (the "current" one, else the first not passed);
 *  - destination: the last stop of the leg;
 *  - nearYou: the stop nearest the passenger's pinned position, if they pinned one (found by the caller).
 *
 * Minutes count from now; a stop whose time has already come shows 0 ("due now"). Nothing is invented: a stop
 * without a time stays without one.
 */

const minutesUntil = (iso, nowMs) => {
  const at = Date.parse(iso || '');
  if (!Number.isFinite(at)) return null;
  return Math.max(0, Math.round((at - nowMs) / 60000));
};

const describe = (row, nowMs) => (row ? {
  stopId: row.stop_id ?? null,
  name: row.name || 'Not provided',
  time: row.eta_time || null,
  minutes: minutesUntil(row.eta, nowMs),
  live: row.eta_source === 'live',
  passed: row.progress === 'passed',
} : null);

/**
 * @param {object|null} timeline the server's trip timeline ({ stops: [...] })
 * @param {number} nowMs
 * @param {number|null} nearStopId the stop nearest the passenger (null when they did not pin a position)
 */
export function busEtaSummary(timeline, nowMs, nearStopId = null) {
  const stops = (Array.isArray(timeline?.stops) ? timeline.stops : []).filter((row) => !row.custom);
  if (stops.length === 0) return null;

  const next = stops.find((row) => row.progress === 'current') ?? stops.find((row) => row.progress !== 'passed') ?? null;
  const near = nearStopId != null ? stops.find((row) => Number(row.stop_id) === Number(nearStopId)) ?? null : null;

  return {
    next: describe(next, nowMs),
    destination: describe(stops[stops.length - 1], nowMs),
    nearYou: describe(near, nowMs),
    finished: !next,
  };
}

/** "in 6 min", "due now", or "" when the time is not known. */
export function etaMinutesLabel(minutes) {
  if (minutes == null) return '';
  return minutes === 0 ? 'due now' : `in ${minutes} min`;
}
