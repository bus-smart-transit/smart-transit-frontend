import { describe, expect, it } from 'vitest';
import { bookingWindowHint, bookingWindowWarning, lastBookableDateOf, parseBookingQuery, withBookingParams } from '../bookingQuery';

describe('booking window helpers (Batch 29)', () => {
  it('preserves an explicitly selected trip in a readable booking link', () => {
    const parsed = parseBookingQuery(new URLSearchParams('from=ecoland-terminal-dcott&to=tagum-integrated-terminal&date=2026-10-19&trip_id=15'));
    expect(parsed.tripId).toBe('15');
    expect(parsed.legacy).toBe(false);
  });

  it('clears a previously selected trip id when the journey is edited', () => {
    const updated = withBookingParams(new URLSearchParams('trip_id=15&tab=booking'), {
      from: 'ecoland-terminal-dcott', to: 'tagum-integrated-terminal', date: '2026-10-20', time: '06:00',
    });
    expect(updated.has('trip_id')).toBe(false);
    expect(updated.get('tab')).toBe('booking');
    expect(updated.get('time')).toBe('06:00');
  });

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

});
