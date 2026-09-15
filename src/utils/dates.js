const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

// The backend always stores/compares trip_date + departure_time as wall-clock
// values in this fixed business timezone (see config('app.timezone') on the
// backend), regardless of where a passenger, driver, or conductor's device
// is physically located or how its OS clock is configured. Any "is this
// today / is this the next trip" comparison MUST be anchored to this
// timezone rather than the device's local timezone — otherwise a device set
// to a different timezone than Asia/Manila will disagree with the backend
// about what day/time it currently is, causing same-day bookings to be
// rejected, the wrong trip to be picked as "current", and PIN/QR generation
// to appear unavailable even though the backend has a valid trip for today.
const BUSINESS_TIMEZONE = 'Asia/Manila';

function getBusinessNowParts() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const map = {};
  for (const part of parts) map[part.type] = part.value;
  // Some locales render midnight as "24" instead of "00" with hour12: false.
  const hour = map.hour === '24' ? '00' : map.hour;

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/**
 * Current wall-clock date in the business timezone (Asia/Manila) as
 * "YYYY-MM-DD", independent of the device's own timezone/clock settings.
 */
export function getBusinessToday() {
  const p = getBusinessNowParts();
  const mm = String(p.month).padStart(2, '0');
  const dd = String(p.day).padStart(2, '0');
  return `${p.year}-${mm}-${dd}`;
}

// ── Dev-only business-time debug logger ──────────────────────────────────
// Given how many past bugs traced back to Manila business-time vs. the
// viewer's local browser time disagreeing, this makes that comparison
// visible in DevTools without tracing through code. Gated behind an env
// flag the same way as the demo-credentials banner / DISABLE_STEP_UP — off
// by default, never logs in production. Read-only diagnostic: it does not
// let you override/simulate "now", it only surfaces what the app currently
// computes "now" to be.
const DEBUG_BUSINESS_TIME = typeof import.meta !== 'undefined'
  && import.meta.env?.VITE_DEBUG_BUSINESS_TIME === 'true';

// De-duped per (context, Manila-calendar-day) so this stays low-noise even
// if the caller re-renders many times in the same day — it only logs again
// once the underlying business day actually changes.
const loggedBusinessTimeContexts = new Set();

/**
 * Logs the current Manila business-time alongside the viewer's local time,
 * for a named call site (e.g. "LandingPage: trip filter",
 * "OperatorDashboard: overdue-flag check"). No-op unless
 * VITE_DEBUG_BUSINESS_TIME=true. Call this at meaningful business-day
 * decision points (filtering, overdue checks) — not on every render.
 */
export function debugLogBusinessTime(context = '') {
  if (!DEBUG_BUSINESS_TIME) return;

  const manilaToday = getBusinessToday();
  const dedupeKey = `${context}|${manilaToday}`;
  if (loggedBusinessTimeContexts.has(dedupeKey)) return;
  loggedBusinessTimeContexts.add(dedupeKey);

  const p = getBusinessNowParts();
  const manilaTime = `${manilaToday} ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}:${String(p.second).padStart(2, '0')}`;

  const local = new Date();
  const localTime = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')} ${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}:${String(local.getSeconds()).padStart(2, '0')}`;
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  console.log(
    `[business-time]${context ? ` ${context}:` : ''} Manila (Asia/Manila) = ${manilaTime} | Viewer local (${localTimezone}) = ${localTime}`,
  );
}

/**
 * A comparable (but NOT real-epoch) millisecond value representing "now" as
 * wall-clock time in the business timezone. Only meaningful when compared
 * against other values produced by this function or toBusinessScheduleMs() —
 * do not mix with Date.now()/new Date().getTime().
 */
export function getBusinessNowMs() {
  const p = getBusinessNowParts();
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/**
 * Builds a comparable ms value (see getBusinessNowMs()) for a trip's
 * "YYYY-MM-DD..." date value plus an "HH:mm[:ss]" time value, both of which
 * represent wall-clock values in the business timezone as returned by the
 * backend (trip_date / departure_time / fleet_route start_time).
 */
export function toBusinessScheduleMs(dateValue, timeValue) {
  const dateStr = String(dateValue || '').trim();
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) return Number.NaN;

  const timeStr = String(timeValue || '00:00:00').trim();
  const timeMatch = timeStr.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
  const hour = timeMatch ? Number(timeMatch[1]) : 0;
  const minute = timeMatch ? Number(timeMatch[2]) : 0;
  const second = timeMatch && timeMatch[3] ? Number(timeMatch[3]) : 0;

  return Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]), hour, minute, second);
}

/**
 * Same-day comparison anchored to the business timezone (Asia/Manila).
 * Use this (not isSameLocalDay) for any trip/business-day logic — e.g.
 * "is this trip today", "is PIN/QR available today". isSameLocalDay remains
 * appropriate only for pure device-local display concerns.
 */
export function isSameBusinessDay(value, referenceDateStr = getBusinessToday()) {
  if (!value) return false;
  const match = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return false;
  return match[1] === referenceDateStr;
}

export function parseAppDate(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;

  const normalized = DATE_ONLY_RE.test(str) ? `${str}T00:00:00` : str;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatAppDate(value, locale = undefined) {
  const date = value instanceof Date ? value : parseAppDate(value);
  if (!date || Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function startOfLocalDay(value = new Date()) {
  const base = value instanceof Date ? new Date(value.getTime()) : parseAppDate(value);
  if (!base || Number.isNaN(base.getTime())) return null;
  base.setHours(0, 0, 0, 0);
  return base;
}

export function isSameLocalDay(left, right = new Date()) {
  const a = startOfLocalDay(left);
  const b = startOfLocalDay(right);
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
}

export function toDateInputValue(value = new Date()) {
  const date = value instanceof Date ? new Date(value.getTime()) : parseAppDate(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}