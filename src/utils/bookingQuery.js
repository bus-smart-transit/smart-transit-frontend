// Booking links carry readable stop codes and a date, never internal ids or a mode:
//   /passenger/book?from=<stop-code>&to=<stop-code>&date=YYYY-MM-DD[&time=HH:MM]
// Everything here is untrusted input until the server has checked it (GET /booking/link).

const CODE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

// Id-based links from before stop codes. A stray `mode` is simply ignored: the mode is page state.
const LEGACY_KEYS = ['origin_stop_id', 'destination_stop_id'];

/** The query string for a journey: { from, to, date?, time? } with stop codes. Empty values are left out. */
export function buildBookingQuery({ from, to, date, time } = {}) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (date) {
    params.set('date', date);
    if (time) params.set('time', time);
  }
  return params.toString();
}

/** The booking page for a trip from the available-trips list: its own stops (codes), date and departure time. */
export function tripBookingPath(trip) {
  return `/passenger/book?${buildBookingQuery({ from: trip.origin?.stop_code, to: trip.destination?.stop_code, date: trip.trip_date, time: trip.boarding_time })}`;
}

/** What a page URL asks for. Shapes are pre-checked so odd input never reaches state; the server still has the last word. */
export function parseBookingQuery(searchParams) {
  const read = (key) => String(searchParams.get(key) || '').trim();
  const from = read('from').toLowerCase();
  const to = read('to').toLowerCase();
  const date = read('date');
  const time = read('time');
  const legacy = LEGACY_KEYS.some((key) => searchParams.has(key));

  return {
    from: CODE.test(from) ? from : (from ? '!' : ''), // '!' = present but malformed; the server words the message
    to: CODE.test(to) ? to : (to ? '!' : ''),
    date: DATE.test(date) ? date : (date ? '!' : ''),
    time: TIME.test(time) ? time : '',
    legacy,
    present: Boolean(from || to || date || legacy),
  };
}

/** The id (string) of the stop with a public code in the server's grouped stop list, or '' when it is not there. */
export function findStopId(groups, stopCode) {
  if (!stopCode) return '';
  for (const group of groups || []) {
    const stop = group.stops?.find((candidate) => candidate.stop_code === stopCode);
    if (stop) return String(stop.stop_id);
  }
  return '';
}

/** The public code of a stop in the server's grouped stop list, or '' when it is not there. */
export function findStopCode(groups, stopId) {
  if (!stopId) return '';
  for (const group of groups || []) {
    const stop = group.stops?.find((candidate) => String(candidate.stop_id) === String(stopId));
    if (stop) return stop.stop_code || '';
  }
  return '';
}

/** The page URL params with the booking keys replaced by the journey, other params (for example a tab) kept. */
export function withBookingParams(current, journey) {
  const next = new URLSearchParams(current);
  ['from', 'to', 'date', 'time'].forEach((key) => next.delete(key));
  new URLSearchParams(buildBookingQuery(journey)).forEach((value, key) => next.set(key, value));
  return next;
}

/** A calendar date (YYYY-MM-DD) plus whole days; pure date arithmetic, so no timezone can shift it. */
export function addDaysToDate(isoDate, days) {
  if (!DATE.test(isoDate || '')) return '';
  const [year, month, day] = isoDate.split('-').map(Number);
  const moved = new Date(Date.UTC(year, month - 1, day + days));
  return moved.toISOString().slice(0, 10);
}
