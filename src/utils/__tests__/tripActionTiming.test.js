import { describe, expect, test } from 'vitest';
import { formatManilaClock, isFinalStopAcknowledged, opensGate } from '../tripActionTiming';

// 2026-10-06 07:30 Manila = 2026-10-05T23:30:00Z.
const opensAt = '2026-10-06T07:30:00+08:00';
const at = (manila) => Date.parse(`${manila}+08:00`);

describe('formatManilaClock', () => {
  test('shows the Manila wall clock whatever the device timezone', () => {
    expect(formatManilaClock('2026-10-05T23:30:00Z')).toBe('7:30 AM');
    expect(formatManilaClock('2026-10-06T13:05:00+08:00')).toBe('1:05 PM');
  });

  test('is empty for a missing or bad value', () => {
    expect(formatManilaClock(null)).toBe('');
    expect(formatManilaClock('not a date')).toBe('');
  });
});

describe('opensGate', () => {
  test('closed before the opening time, with the time to show', () => {
    expect(opensGate(opensAt, at('2026-10-06T07:29:00'))).toEqual({ open: false, label: 'Opens at 7:30 AM' });
    expect(opensGate(opensAt, at('2026-10-06T06:00:00'), 'Pairing opens')).toEqual({ open: false, label: 'Pairing opens at 7:30 AM' });
  });

  test('open from the opening time on, also long after it (a late trip)', () => {
    expect(opensGate(opensAt, at('2026-10-06T07:30:00')).open).toBe(true);
    expect(opensGate(opensAt, at('2026-10-06T11:00:00'))).toEqual({ open: true, label: '' });
  });

  test('names the day when it opens on another day', () => {
    expect(opensGate(opensAt, at('2026-10-05T20:00:00')).label).toBe('Opens on Oct 6 at 7:30 AM');
  });

  test('does not hold an action back when the opening time is unknown', () => {
    expect(opensGate(null, at('2026-10-06T05:00:00')).open).toBe(true);
    expect(opensGate('garbage', at('2026-10-06T05:00:00')).open).toBe(true);
  });
});

describe('isFinalStopAcknowledged', () => {
  test('only once the last stop in travel order is acknowledged', () => {
    expect(isFinalStopAcknowledged([{ is_acknowledged: true }, { is_acknowledged: false }])).toBe(false);
    expect(isFinalStopAcknowledged([{ is_acknowledged: true }, { is_acknowledged: true }])).toBe(true);
  });

  test('a route without stops does not wait', () => {
    expect(isFinalStopAcknowledged([])).toBe(true);
    expect(isFinalStopAcknowledged(undefined)).toBe(true);
  });
});
