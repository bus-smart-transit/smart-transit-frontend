import { describe, expect, it } from 'vitest';
import { bookingWindowHint, bookingWindowWarning, lastBookableDateOf } from '../bookingQuery';
import { validateReturnInput } from '../roundtrip';

describe('booking window helpers (Batch 29)', () => {
  it('uses the last date the server sent, and only falls back to today + days', () => {
    expect(lastBookableDateOf({ today: '2026-10-05', maxAdvanceDays: 30, lastBookableDate: '2026-11-04' })).toBe('2026-11-04');
    expect(lastBookableDateOf({ today: '2026-10-05', maxAdvanceDays: 30 })).toBe('2026-11-04');
    expect(lastBookableDateOf({ today: '2026-10-05', maxAdvanceDays: 45 })).toBe('2026-11-19');
    expect(lastBookableDateOf({ today: '2026-10-05', maxAdvanceDays: 0 })).toBe('');
  });

  it('explains the limit in one short sentence', () => {
    expect(bookingWindowHint({ maxAdvanceDays: 30, lastBookableDate: '2026-11-04' })).toBe('Tickets open up to 30 days ahead. Latest date: Nov 4, 2026.');
    expect(bookingWindowHint({ maxAdvanceDays: 30, lastBookableDate: '' })).toBe('');
  });

  it('warns the Operator, without blocking, when a service is dated beyond the window', () => {
    const window = { today: '2026-10-05', max_advance_days: 30, last_bookable_date: '2026-11-04' };
    expect(bookingWindowWarning('2026-11-18', window)).toBe('Passengers cannot book this date yet. Booking opens on Oct 19, 2026.');
    expect(bookingWindowWarning('2026-11-04', window)).toBe('');
    expect(bookingWindowWarning('2026-10-06', window)).toBe('');
    expect(bookingWindowWarning('', window)).toBe('');
    expect(bookingWindowWarning('2026-11-18', null)).toBe('');
  });

  it('rejects a return date after the server last bookable date (inclusive boundary)', () => {
    const base = { outboundDate: '2026-10-05', outboundTime: '08:00', today: '2026-10-05', maxAdvanceDays: 30, lastBookableDate: '2026-11-04', returnTime: '' };
    expect(validateReturnInput({ ...base, returnDate: '2026-11-04' }).returnDate).toBeUndefined();
    expect(validateReturnInput({ ...base, returnDate: '2026-11-05' }).returnDate).toMatch(/up to 30 days ahead/);
  });
});
