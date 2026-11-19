// Batch 51 item 7 (user, 2026-11-09): booking for someone else. Their contact is an email or a Philippine mobile number;
// once the passenger starts typing a number (a digit or "+"), the field takes numbers only. Mirrors the server's
// App\Support\TravellerContact (the server decides).

/** True when the value is being typed as a phone number. */
export const looksLikePhone = (value) => /^[\d+]/.test(String(value ?? '').trim());

/** What the field keeps as the passenger types: a number keeps only a leading "+" and digits; an email is unchanged. */
export function cleanContactInput(value) {
  const text = String(value ?? '');
  if (!looksLikePhone(text)) return text;
  const trimmed = text.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return (plus + trimmed.replace(/\D/g, '')).slice(0, 13);
}

/** The stored form (+639XXXXXXXXX or the email in lower case), or null when it is neither. */
export function normalizeContact(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (text.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text.toLowerCase() : null;
  const match = text.replace(/[\s\-()]/g, '').match(/^(?:\+?63|0)(9\d{9})$/);
  return match ? `+63${match[1]}` : null;
}
