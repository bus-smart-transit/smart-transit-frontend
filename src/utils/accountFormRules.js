// Batch 46 (2026-11-05): the field rules shared by passenger sign-up and the Operator's Add / Edit Staff form, so the
// two cannot drift apart. The server checks again; these only help before sending. Messages are plain language.

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const LOOSE_PHONE_PATTERN = /^\+?[\d\s\-()]{7,15}$/;
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,50}$/;

export function nameErrors({ firstName, lastName }) {
  const errors = {};
  if (!String(firstName ?? '').trim()) errors.firstName = 'First name is required';
  if (!String(lastName ?? '').trim()) errors.lastName = 'Last name is required';
  return errors;
}

export function emailError(email) {
  const value = String(email ?? '').trim();
  if (!value) return 'Email is required';
  if (!EMAIL_PATTERN.test(value)) return 'Enter a valid email';
  return '';
}

export function birthDateError(value, label = 'Date of birth') {
  if (!value) return `${label} is required`;
  if (value >= new Date().toISOString().slice(0, 10)) return `${label} must be in the past`;
  return '';
}

export function usernameError(value) {
  const username = String(value ?? '').trim();
  if (!username) return 'Username is required';
  if (!USERNAME_PATTERN.test(username)) return 'Use 3 to 50 letters, numbers, dots, dashes or underscores';
  return '';
}

export function passwordError(password) {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) return 'Must include uppercase, lowercase, and a number';
  return '';
}

export function confirmPasswordError(password, confirm) {
  if (!confirm) return 'Please confirm your password';
  if (password !== confirm) return 'Passwords do not match';
  return '';
}

export const passwordHints = (password = '') => [
  { check: password.length >= 8, label: 'At least 8 characters' },
  { check: /[A-Z]/.test(password), label: 'One uppercase letter' },
  { check: /[a-z]/.test(password), label: 'One lowercase letter' },
  { check: /\d/.test(password), label: 'One number' },
];

export const STRENGTH_INFO = [
  { label: '', color: 'transparent' },
  { label: 'Very Weak', color: '#ef4444' },
  { label: 'Weak', color: '#f97316' },
  { label: 'Fair', color: '#eab308' },
  { label: 'Strong', color: '#22c55e' },
  { label: 'Very Strong', color: '#06b6d4' },
];

export function passwordStrength(password = '') {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;
  return score;
}

/** Drops empty messages so `Object.keys(errors).length` means "something is wrong". */
export function compactErrors(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => Boolean(message)));
}
