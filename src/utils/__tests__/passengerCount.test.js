import { describe, expect, it } from 'vitest';
import { passengerCountLine, passengerCountRows } from '../passengerCount';

// SAMPLE values, shaped like the server's TripPassengerCount.
const COUNT = { tickets_sold: 19, scanned_in: 15, on_board: 12, got_off: 3, not_scanned: 2, missed: 1, expired: 1 };

describe('passengerCount (Batch 76)', () => {
  it('lists the count with on board first, the number an inspector checks', () => {
    const rows = passengerCountRows(COUNT);
    expect(rows[0]).toEqual({ key: 'on_board', label: 'On board now', value: 12 });
    expect(rows.map((row) => row.label)).toEqual(['On board now', 'Scanned in', 'Got off', 'Not scanned yet', 'Missed', 'Expired', 'Tickets sold']);
  });

  it('shows nothing when there is no count, and never makes up a zero', () => {
    expect(passengerCountRows(null)).toEqual([]);
    expect(passengerCountRows({ on_board: 3 })[1].value).toBeNull();
    expect(passengerCountLine(undefined)).toBe('Not provided');
  });

  it('gives a one-line summary', () => {
    expect(passengerCountLine(COUNT)).toBe('On board 12 · Scanned in 15 · Sold 19');
  });
});
