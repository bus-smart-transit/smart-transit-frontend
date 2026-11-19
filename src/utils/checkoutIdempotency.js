const STORAGE_KEY = 'smart_transit_checkout_idempotency_v1';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function fingerprint(scope, payload) {
  const value = `${scope}:${JSON.stringify(canonicalize(payload))}`;
  let first = 2166136261;
  let second = 2246822519;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619) >>> 0;
    second = Math.imul(second ^ code, 3266489917) >>> 0;
  }

  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`;
}

function newKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (globalThis.crypto?.getRandomValues) {
    return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function checkoutIdempotencyKey(scope, payload) {
  const requestFingerprint = fingerprint(scope, payload);
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (stored?.scope === scope && stored?.fingerprint === requestFingerprint && typeof stored.key === 'string') {
      return stored.key;
    }

    const key = newKey();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ scope, fingerprint: requestFingerprint, key }));
    return key;
  } catch {
    return newKey();
  }
}

export function clearCheckoutIdempotencyKey(scope) {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (!scope || stored?.scope === scope) sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * §12: a failed checkout keeps its key so an identical retry replays it. When the server answers 409 with
 * errors.checkout = ["retry_with_new_key"], the earlier attempt is over and its seats are free: drop the key (and on 422).
 */
export function shouldDropCheckoutKey(error) {
  const response = error?.cause?.response ?? error?.response;
  if (response?.status === 422) return true;
  return response?.status === 409 && (response?.data?.errors?.checkout ?? []).includes('retry_with_new_key');
}
