import { describe, expect, test } from 'vitest';
import { formatPhone, splitPhone, toE164 } from '../phone';
import { editStaffForm, emptyStaffForm, roleLabel, serverFieldErrors, toCreatePayload, toUpdatePayload, validateStaffForm } from '../staffForm';
import { crewOptionLabel, isPickable, needsCrew, sortForPicker } from '../crewPicker';
import { pageSummary } from '../pagination';
import { emailError, nameErrors, passwordError } from '../accountFormRules';

// Batch 46: the Staff Directory, Add / Edit Staff and the crew pickers.

describe('phone (mirrors App\\Support\\PhoneNumber)', () => {
  test('makes one E.164 number from what is typed, and refuses a wrong one', () => {
    expect(toE164('+63', '917 123 4567')).toBe('+639171234567');
    expect(toE164('+63', '0917-123-4567')).toBe('+639171234567');
    expect(toE164('+63', '639171234567')).toBe('+639171234567');
    expect(toE164('+63', '817 123 4567')).toBeNull();
    expect(toE164('+63', '')).toBeNull();
    expect(toE164('+1', '415 555 0100')).toBe('+14155550100');
  });

  test('splits a stored number for the drop-down, reads an older 09... number as +63, and formats for display', () => {
    expect(splitPhone('+639171234567')).toEqual({ callingCode: '+63', local: '9171234567' });
    expect(splitPhone('09171234567')).toEqual({ callingCode: '+63', local: '9171234567' });
    expect(splitPhone('+85291234567')).toEqual({ callingCode: '+852', local: '91234567' });
    expect(splitPhone(null)).toEqual({ callingCode: '+63', local: '' });
    expect(formatPhone('+639171234567')).toBe('+63 917 123 4567');
    expect(formatPhone('')).toBe('Not provided');
  });
});

describe('staff form', () => {
  const filled = {
    ...emptyStaffForm('conductor'),
    firstName: ' Ana ', lastName: 'Reyes', username: 'ana.reyes', email: 'Ana@Example.com',
    phoneLocal: '917 000 1111', birthDate: '1995-02-03', address: 'Panabo', password: 'Strong-pass1', confirmPassword: 'Strong-pass1',
  };

  test('Add needs the sign-up fields plus username, address and birth date', () => {
    const errors = validateStaffForm(emptyStaffForm(), 'add');
    expect(Object.keys(errors).sort()).toEqual(['address', 'birthDate', 'confirmPassword', 'email', 'firstName', 'lastName', 'password', 'phone', 'username']);
    expect(validateStaffForm(filled, 'add')).toEqual({});
    expect(validateStaffForm({ ...filled, phoneLocal: '12' }, 'add').phone).toBe('Enter a valid mobile number, for example 917 123 4567.');
    expect(validateStaffForm({ ...filled, birthDate: '2999-01-01' }, 'add').birthDate).toBe('Birth date must be in the past');
  });

  test('builds the create body with one name, a lowercase email and an E.164 phone', () => {
    expect(toCreatePayload(filled)).toEqual({
      role: 'conductor', name: 'Ana Reyes', username: 'ana.reyes', email: 'ana@example.com', phone_num: '+639170001111',
      birth_date: '1995-02-03', gender: null, address: 'Panabo', password: 'Strong-pass1',
    });
  });

  test('Edit checks only username, email and phone, and sends only what changed', () => {
    const member = { role: 'driver', username: 'juan', email: 'juan@example.com', phone_num: '+639171234567' };
    const form = editStaffForm(member);
    expect(validateStaffForm(form, 'edit')).toEqual({});
    expect(toUpdatePayload(form, member)).toEqual({});
    expect(toUpdatePayload({ ...form, email: 'NEW@example.com', phoneLocal: '0918 765 4321' }, member)).toEqual({ email: 'new@example.com', phone_num: '+639187654321' });
  });

  test('shows Chauffeur, never the stored word, and maps server field names', () => {
    expect(roleLabel('conductor')).toBe('Chauffeur');
    expect(roleLabel('driver')).toBe('Driver');
    expect(roleLabel(undefined)).toBe('Not provided');
    expect(serverFieldErrors({ phone_num: ['Bad phone'], email: ['Taken'] })).toEqual({ phone: 'Bad phone', email: 'Taken' });
  });

  test('the shared sign-up rules', () => {
    expect(nameErrors({ firstName: '', lastName: 'x' })).toEqual({ firstName: 'First name is required' });
    expect(emailError('nope')).toBe('Enter a valid email');
    expect(passwordError('alllowercase1')).toBe('Must include uppercase, lowercase, and a number');
  });
});

describe('crew pickers', () => {
  const ana = { company_user_id: 1, name: 'Ana', user: { username: 'ana' }, is_available: true };
  const ben = { company_user_id: 2, name: 'Ben', user: { username: 'ben' }, is_available: false };
  const abe = { company_user_id: 3, name: 'Abe', user: { username: 'abe' }, is_available: true };

  test('marks Not Available people and lists them last', () => {
    expect(crewOptionLabel(ana)).toBe('Ana (@ana)');
    expect(crewOptionLabel(ben)).toBe('Ben (@ben) - Not Available');
    expect(isPickable(ben)).toBe(false);
    expect(sortForPicker([ben, ana, abe]).map((p) => p.name)).toEqual(['Abe', 'Ana', 'Ben']);
  });

  test('a trip needs crew until it has both', () => {
    expect(needsCrew({ driver_id: 1, conductor_id: null })).toBe(true);
    expect(needsCrew({ driver_id: 1, conductor_id: 2 })).toBe(false);
  });
});

test('page footer text', () => {
  expect(pageSummary({ page: 1, perPage: 10, total: 23 })).toBe('Showing 1 to 10 of 23');
  expect(pageSummary({ page: 3, perPage: 10, total: 23 })).toBe('Showing 21 to 23 of 23');
  expect(pageSummary({ page: 1, perPage: 10, total: 0 })).toBe('Showing 0 of 0');
});
