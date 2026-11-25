import { describe, expect, it } from 'vitest';
import { splitDeparture, ticketExtraRows, ticketPrintHtml } from '../ticketPrint';

// Batch 80 (user, 2026-11-19): the printed ticket in the designer's ticket design, one layout for both pages.
describe('ticketPrint', () => {
  it('splits the app date-time label into the date and the time', () => {
    expect(splitDeparture('2026/11/19 - 2:00 PM')).toEqual({ date: '2026/11/19', time: '2:00 PM' });
    expect(splitDeparture('2:00 PM')).toEqual({ date: null, time: '2:00 PM' });
    expect(splitDeparture('')).toEqual({ date: null, time: null });
  });

  it('lists discount, priority seat and baggage rows, and never a seat type', () => {
    const rows = ticketExtraRows({ discount_amount: 30, original_amount: 152, discount_label: 'Student', discount_id_checked_at: '2026-11-18', priority_label: 'Pregnant', has_baggage: true, seat_type: 'seated' });
    expect(rows.map((r) => r.label)).toEqual(['Original fare', 'Student discount', 'ID check', 'Priority seat', 'Baggage']);
    expect(ticketExtraRows({ seat_type: 'seated' })).toEqual([]);
    // 2026-11-25 (user): baggage is declared online and paid in cash on board.
    expect(ticketExtraRows({ has_baggage: true })).toEqual([{ label: 'Baggage', value: 'Declared. Pay the Chauffeur in cash on board' }]);
    expect(ticketExtraRows({ has_baggage: true, baggage_paid: 50 })).toEqual([{ label: 'Baggage', value: 'Paid PHP 50.00 on board' }]);
  });

  it('prints the ticket with its status, date, time, fare, Ticket ID and QR, and escapes every value', () => {
    const html = ticketPrintHtml({ from: 'Stop <A>', to: 'Stop B', departure: '2026/11/19 - 2:00 PM', fare: 152, status: 'boarded', ticketId: '3F9A12BC', traveller: 'Sam "Sample"', rows: [{ label: 'Baggage', value: 'In the compartment (in the fare)' }], qrSrc: 'data:image/png;base64,AAA' });
    expect(html).toContain('Stop &lt;A&gt;');
    expect(html).toContain('Passenger: Sam &quot;Sample&quot;');
    expect(html).toContain('2026/11/19');
    expect(html).toContain('2:00 PM');
    expect(html).toContain('PHP 152.00');
    expect(html).toContain('3F9A12BC');
    expect(html).toContain('>Boarded<');
    expect(html).toContain('Boarded — You are currently on this trip');
    expect(html).toContain('src="data:image/png;base64,AAA"');
    expect(html).not.toMatch(/Seat</);
  });
});
