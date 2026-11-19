import { describe, expect, it } from 'vitest';
import { cleanContactInput, looksLikePhone, normalizeContact } from '../travellerContact';

// Batch 51 item 7: an email or a Philippine mobile number; a number takes digits only as it is typed.
describe('travellerContact', () => {
  it('switches to numbers only once a digit or + is typed', () => {
    expect(looksLikePhone('0917')).toBe(true);
    expect(looksLikePhone('+63')).toBe(true);
    expect(looksLikePhone('ana@')).toBe(false);
    expect(cleanContactInput('0917abc-123 4567')).toBe('09171234567');
    expect(cleanContactInput('+63 917 123 4567 99')).toBe('+639171234567');
    expect(cleanContactInput('ana@example.com')).toBe('ana@example.com');
  });

  it('accepts an email or a Philippine mobile number, like the server', () => {
    expect(normalizeContact('Ana@Example.com')).toBe('ana@example.com');
    expect(normalizeContact('09171234567')).toBe('+639171234567');
    expect(normalizeContact('+639171234567')).toBe('+639171234567');
    expect(normalizeContact('12345')).toBeNull();
    expect(normalizeContact('')).toBeNull();
  });
});
