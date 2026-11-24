// 2026-11-24 (user): one toast (snackbar) for the whole website. Any screen or hook calls showToast; the Toaster at the
// app root shows them. A plain module store (no provider), so hooks outside the React tree of a page can call it too.
//
// A toast: { id, tone: 'info' | 'success' | 'danger', title, body, actionLabel, onAction, sticky, duration }.
// `sticky` stays until dismissed (an emergency); the others leave after `duration` ms (default 6 s).

const MAX_TOASTS = 4;
export const DEFAULT_TOAST_MS = 6000;

let toasts = [];
let nextId = 1;
const listeners = new Set();

const emit = () => { listeners.forEach((listener) => listener()); };

export function getToasts() {
  return toasts;
}

export function subscribeToasts(listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Shows a toast and returns its id. With `key`, a toast with the same key is replaced instead of stacked. */
export function showToast({ tone = 'info', title = '', body = '', actionLabel = '', onAction = null, sticky = false, duration = DEFAULT_TOAST_MS, key = null } = {}) {
  if (!title && !body) return null;
  const id = nextId++;
  const toast = { id, tone, title, body, actionLabel, onAction, sticky, duration, key };
  const kept = key ? toasts.filter((item) => item.key !== key) : toasts;
  // Too many: the oldest that is not sticky leaves first (an emergency stays).
  let next = [...kept, toast];
  while (next.length > MAX_TOASTS) {
    const drop = next.findIndex((item) => !item.sticky);
    next = next.filter((_, index) => index !== (drop === -1 ? 0 : drop));
  }
  toasts = next;
  emit();
  return id;
}

export function dismissToast(id) {
  const next = toasts.filter((item) => item.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

/** For tests. */
export function clearToasts() {
  toasts = [];
  emit();
}

/**
 * The items that arrived since the last read, by id. The first read (seen null) is the page loading, so nothing is
 * new then: only what comes after it is announced.
 */
export function newItemsSince(seen, items, idOf) {
  if (!seen) return [];
  return (Array.isArray(items) ? items : []).filter((item) => !seen.has(idOf(item)));
}
