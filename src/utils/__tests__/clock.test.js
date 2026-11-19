import { describe, expect, it } from 'vitest';
import { clock12, clockRange } from '../clock';

// Batch 79 (panelist's advice, 2026-11-18): every time people read is on a 12-hour clock.
describe('clock12', () => {
  it('turns 24-hour values into a 12-hour clock', () => {
    expect(clock12('00:05')).toBe('12:05 AM');
    expect(clock12('06:30:00')).toBe('6:30 AM');
    expect(clock12('12:00')).toBe('12:00 PM');
    expect(clock12('13:30')).toBe('1:30 PM');
    expect(clock12('23:59')).toBe('11:59 PM');
  });

  it('reads a Manila wall-clock date-time as written, and an instant in Manila time', () => {
    expect(clock12('2026-11-18 17:45:00')).toBe('5:45 PM');
    expect(clock12('2026-11-18T09:30:00Z')).toBe('5:30 PM');
    expect(clock12('2026-11-18T12:39:00+08:00')).toBe('12:39 PM');
  });

  it('gives null for nothing or nonsense, so the screen shows its own Not provided', () => {
    expect(clock12(null)).toBeNull();
    expect(clock12('')).toBeNull();
    expect(clock12('soon')).toBeNull();
    expect(clock12('25:00')).toBeNull();
  });

  it('writes a range, or the one time it has', () => {
    expect(clockRange('05:00', '21:00')).toBe('5:00 AM – 9:00 PM');
    expect(clockRange('05:00', null)).toBe('5:00 AM');
    expect(clockRange(null, null)).toBeNull();
  });
});
