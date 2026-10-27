/**
 * 2026-10-27: how long the checkout return page waits before asking for the payment status again. After "too many
 * requests" (429) it waits as long as the server asks (Retry-After, in seconds; at most a minute) instead of asking
 * again at the usual pace and being refused again.
 */
const MAX_BACKOFF_MS = 60000;

export function nextCheckDelay(error, usualMs) {
  if (error?.response?.status !== 429) return usualMs;
  const seconds = Number(error.response.headers?.['retry-after']);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, MAX_BACKOFF_MS) : MAX_BACKOFF_MS;
}
