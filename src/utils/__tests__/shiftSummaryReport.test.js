import { describe, expect, it } from 'vitest';
import { shiftSummaryCsv, shiftSummaryFileName } from '../shiftSummaryReport';

describe('shiftSummaryCsv', () => {
  it('writes the server totals, every trip and the unpaid check-ins', () => {
    const csv = shiftSummaryCsv({
      net_total: 120, onsite_amount: 80, online_amount: 40, refunded_amount: 0, passenger_count: 5,
      shift: { expected_cash: 80 },
      trips: [{ trip_id: 7, origin: 'Tagum', destination: 'Panabo, Davao', scheduled_time: '06:00', entry_time: '06:02', exit_time: null, passenger_count: 5, fare: 120 }],
      unpaid_check_ins: [{ checked_in_at: '10:42', stop_name: 'Stop B' }],
    }, { chauffeur: 'Ana', date: '2026-10-27' });

    const lines = csv.split('\r\n');
    expect(lines).toContain('Net revenue (PHP),120.00');
    expect(lines).toContain('Cash to hand over (PHP),80.00');
    expect(lines).toContain('7,Tagum,"Panabo, Davao",06:00,06:02,Not provided,5,120.00');
    expect(lines).toContain('10:42,Stop B');
  });

  it('says "Not provided" instead of inventing a number', () => {
    expect(shiftSummaryCsv(null).split('\r\n')).toContain('Net revenue (PHP),Not provided');
  });

  it('names the file after the date', () => {
    expect(shiftSummaryFileName('2026-10-27')).toBe('shift-summary-2026-10-27.csv');
  });
});
