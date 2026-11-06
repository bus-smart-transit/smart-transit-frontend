// Batch 46 / Batch 47 part B (decided 2026-11-05): one phone format, E.164 (+639171234567). The server's
// App\Support\PhoneNumber is the rule; this file mirrors it so the form can help before sending. The country list is
// short and kept here only. Philippines is first and the default.

export const COUNTRIES = [
  { code: '+63', iso: 'PH', name: 'Philippines' },
  { code: '+65', iso: 'SG', name: 'Singapore' },
  { code: '+60', iso: 'MY', name: 'Malaysia' },
  { code: '+62', iso: 'ID', name: 'Indonesia' },
  { code: '+852', iso: 'HK', name: 'Hong Kong' },
  { code: '+81', iso: 'JP', name: 'Japan' },
  { code: '+82', iso: 'KR', name: 'South Korea' },
  { code: '+971', iso: 'AE', name: 'United Arab Emirates' },
  { code: '+966', iso: 'SA', name: 'Saudi Arabia' },
  { code: '+1', iso: 'US', name: 'United States or Canada' },
  { code: '+44', iso: 'GB', name: 'United Kingdom' },
  { code: '+61', iso: 'AU', name: 'Australia' },
];

export const DEFAULT_CALLING_CODE = '+63';

export const PHONE_INVALID_MESSAGE = 'Enter a valid mobile number, for example 917 123 4567.';

const digitsOf = (value) => String(value ?? '').replace(/\D/g, '');

/** The E.164 number for a calling code and the typed local part, or null when it is not valid. */
export function toE164(callingCode, local) {
  const code = callingCode || DEFAULT_CALLING_CODE;
  let digits = digitsOf(local);
  if (!digits) return null;
  if (code === '+63') {
    if (digits.startsWith('63') && digits.length === 12) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = digits.slice(1);
    return /^9\d{9}$/.test(digits) ? `+63${digits}` : null;
  }
  const all = digitsOf(code) + digits.replace(/^0+/, '');
  return all.length >= 8 && all.length <= 15 ? `+${all}` : null;
}

/** Splits a stored number into the drop-down code and the local part. An older stored shape (0917...) reads as +63. */
export function splitPhone(stored) {
  const raw = String(stored ?? '').trim();
  if (!raw) return { callingCode: DEFAULT_CALLING_CODE, local: '' };
  if (!raw.startsWith('+')) {
    return { callingCode: DEFAULT_CALLING_CODE, local: digitsOf(raw).replace(/^0/, '') };
  }
  const match = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length).find((country) => raw.replace(/\s/g, '').startsWith(country.code));
  if (!match) return { callingCode: DEFAULT_CALLING_CODE, local: digitsOf(raw) };
  return { callingCode: match.code, local: digitsOf(raw.replace(/\s/g, '').slice(match.code.length)) };
}

/** "+63 917 123 4567" for a Philippine mobile, the number as stored otherwise, "Not provided" when empty. */
export function formatPhone(stored) {
  const raw = String(stored ?? '').trim();
  if (!raw) return 'Not provided';
  const ph = raw.replace(/\s/g, '').match(/^\+63(9\d{2})(\d{3})(\d{4})$/);
  return ph ? `+63 ${ph[1]} ${ph[2]} ${ph[3]}` : raw;
}
