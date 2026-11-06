// Batch 46 (decided 2026-11-05): the Operator's Add Staff and Edit Staff form. Add uses the sign-up rules (first and
// last name, email, phone, birth date, password) plus the staff extras (role, username; address and birth date
// required). Edit changes username, phone and email only.
import {
  nameErrors,
  emailError,
  birthDateError,
  usernameError,
  passwordError,
  confirmPasswordError,
  compactErrors,
} from './accountFormRules';
import { DEFAULT_CALLING_CODE, PHONE_INVALID_MESSAGE, splitPhone, toE164 } from './phone';

export const ROLE_LABELS = { driver: 'Driver', conductor: 'Chauffeur' };

/** "Driver" or "Chauffeur" (never the stored word "conductor"); "Not provided" when unknown. */
export const roleLabel = (role) => ROLE_LABELS[String(role ?? '').toLowerCase()] ?? 'Not provided';

export function emptyStaffForm(role = 'driver') {
  return {
    role,
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    callingCode: DEFAULT_CALLING_CODE,
    phoneLocal: '',
    birthDate: '',
    gender: '',
    address: '',
    password: '',
    confirmPassword: '',
  };
}

/** The Edit form, filled from a Staff Directory row. */
export function editStaffForm(member) {
  const { callingCode, local } = splitPhone(member?.phone_num);
  return {
    ...emptyStaffForm(member?.role ?? 'driver'),
    username: member?.username ?? '',
    email: member?.email ?? '',
    callingCode,
    phoneLocal: local,
  };
}

/** Field messages for 'add' or 'edit'; an empty object means the form can be sent. */
export function validateStaffForm(form, mode = 'add') {
  const errors = {
    username: usernameError(form.username),
    email: emailError(form.email),
    phone: !String(form.phoneLocal ?? '').trim()
      ? 'Phone number is required'
      : (toE164(form.callingCode, form.phoneLocal) ? '' : PHONE_INVALID_MESSAGE),
  };
  if (mode === 'add') {
    Object.assign(errors, nameErrors(form), {
      birthDate: birthDateError(form.birthDate, 'Birth date'),
      address: String(form.address ?? '').trim() ? '' : 'Address is required',
      password: passwordError(form.password),
      confirmPassword: confirmPasswordError(form.password, form.confirmPassword),
    });
  }
  return compactErrors(errors);
}

export function toCreatePayload(form) {
  return {
    role: form.role,
    name: `${form.firstName.trim()} ${form.lastName.trim()}`,
    username: form.username.trim(),
    email: form.email.trim().toLowerCase(),
    phone_num: toE164(form.callingCode, form.phoneLocal),
    birth_date: form.birthDate,
    gender: form.gender || null,
    address: form.address.trim(),
    password: form.password,
  };
}

/** Only what changed, so an untouched field is never sent. */
export function toUpdatePayload(form, member) {
  const changes = {};
  const username = form.username.trim();
  const email = form.email.trim().toLowerCase();
  const phone = toE164(form.callingCode, form.phoneLocal);
  if (username !== (member?.username ?? '')) changes.username = username;
  if (email !== (member?.email ?? '')) changes.email = email;
  if (phone && phone !== (member?.phone_num ?? '')) changes.phone_num = phone;
  return changes;
}

/** Server field names to this form's field names, for showing a server refusal under the right input. */
export function serverFieldErrors(fieldErrors = {}) {
  const map = { name: 'firstName', phone_num: 'phone', birth_date: 'birthDate' };
  return Object.fromEntries(Object.entries(fieldErrors).map(([field, messages]) => [
    map[field] ?? field,
    Array.isArray(messages) ? messages[0] : String(messages),
  ]));
}
