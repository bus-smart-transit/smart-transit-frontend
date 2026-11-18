// Batch 79 (panelist's advice, 2026-11-18): every time people read is on a 12-hour clock ("1:30 PM"). The server keeps
// sending 24-hour values ("13:30", ISO date-times) because code compares them and time inputs use them; only what is
// shown changes, through this one helper.

const TIME_ONLY = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;
const WALL_CLOCK = /^\d{4}-\d{2}-\d{2}[ T](\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;

function fromParts(hours, minutes) {
  const h = Number(hours);
  const m = Number(minutes);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 24 || m < 0 || m > 59) return null;
  const h24 = h % 24;
  const suffix = h24 < 12 ? 'AM' : 'PM';
  return `${h24 % 12 === 0 ? 12 : h24 % 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/**
 * "13:30", "13:30:00", "2026-11-18 13:30:00" (a Manila wall-clock value), an ISO date-time with a zone, or a Date
 * becomes "1:30 PM" (date-times with a zone are read in Manila time). Empty or unreadable: null, so a caller can show
 * its own "Not provided".
 */
export function clock12(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date || typeof value === 'number') {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
  }
  const text = String(value).trim();
  const time = text.match(TIME_ONLY);
  if (time) return fromParts(time[1], time[2]);
  const wall = text.match(WALL_CLOCK);
  if (wall) return fromParts(wall[1], wall[2]);
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : clock12(new Date(parsed));
}

/** "7:00 AM to 9:30 PM" style range; a missing end shows the start alone. */
export function clockRange(start, end, joiner = ' – ') {
  const a = clock12(start);
  const b = clock12(end);
  if (a && b) return `${a}${joiner}${b}`;
  return a || b || null;
}
