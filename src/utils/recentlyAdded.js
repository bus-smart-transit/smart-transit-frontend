// 2026-11-25 (user): on the Operator's lists, something newly added is highlighted and shown first. This is the one
// rule for it. "New" means added in the last NEW_FOR_HOURS hours, read from the row's own created time (created_at, or
// joined_at for staff). New rows come first, newest at the top; every other row keeps the list's usual order.

export const NEW_FOR_HOURS = 24;

const HOUR_MS = 60 * 60 * 1000;
// A created time a few minutes ahead of this device's clock still counts as just added.
const CLOCK_SKEW_MS = 5 * 60 * 1000;

/** Milliseconds since 1970 for an API time ("2026-11-25T05:21:35.000000Z"), or null when it cannot be read. */
export function createdTime(value) {
  if (!value) return null;
  // Laravel sends six fraction digits; keep three, which every browser reads.
  const text = String(value).replace(/(\.\d{3})\d+/, '$1');
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? null : ms;
}

/** True when the time is within the last NEW_FOR_HOURS hours. */
export function isRecentlyAdded(value, now = Date.now()) {
  const ms = createdTime(value);
  if (ms === null) return false;
  return ms <= now + CLOCK_SKEW_MS && now - ms < NEW_FOR_HOURS * HOUR_MS;
}

/** The row's created time: created_at, else joined_at. */
export const createdOf = (row) => row?.created_at ?? row?.joined_at ?? null;

/**
 * New rows first (newest at the top), then the others in their given order. `getCreated` reads a row's created time.
 * Returns a new array; the input is not changed.
 */
export function newFirst(rows, getCreated = createdOf, now = Date.now()) {
  const list = Array.isArray(rows) ? rows : [];
  const fresh = [];
  const rest = [];
  list.forEach((row) => (isRecentlyAdded(getCreated(row), now) ? fresh : rest).push(row));
  fresh.sort((a, b) => (createdTime(getCreated(b)) ?? 0) - (createdTime(getCreated(a)) ?? 0));
  return [...fresh, ...rest];
}
