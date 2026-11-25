import { describe, expect, it } from 'vitest';
import { createdTime, isRecentlyAdded, newFirst } from '../recentlyAdded';

const now = Date.parse('2026-11-25T06:00:00Z');

describe('recentlyAdded', () => {
  it('reads Laravel times with six fraction digits', () => {
    expect(createdTime('2026-11-25T05:21:35.000000Z')).toBe(Date.parse('2026-11-25T05:21:35Z'));
    expect(createdTime('')).toBeNull();
    expect(createdTime('not a date')).toBeNull();
  });

  it('counts the last 24 hours as new', () => {
    expect(isRecentlyAdded('2026-11-25T05:00:00.000000Z', now)).toBe(true);
    expect(isRecentlyAdded('2026-11-24T06:30:00.000000Z', now)).toBe(true);
    expect(isRecentlyAdded('2026-11-24T05:59:00.000000Z', now)).toBe(false);
    expect(isRecentlyAdded(null, now)).toBe(false);
  });

  it('puts new rows first, newest at the top, and keeps the others in order', () => {
    const rows = [
      { id: 1, created_at: '2026-10-01T00:00:00Z' },
      { id: 2, created_at: '2026-11-25T01:00:00Z' },
      { id: 3, created_at: '2026-09-01T00:00:00Z' },
      { id: 4, created_at: '2026-11-25T05:00:00Z' },
      { id: 5, joined_at: '2026-11-25T03:00:00Z' },
    ];
    expect(newFirst(rows, undefined, now).map((row) => row.id)).toEqual([4, 5, 2, 1, 3]);
    expect(rows.map((row) => row.id)).toEqual([1, 2, 3, 4, 5]);
    expect(newFirst(null)).toEqual([]);
  });
});
