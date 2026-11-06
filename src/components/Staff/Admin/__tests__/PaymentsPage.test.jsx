import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import PaymentsPage from '../PaymentsPage';
import { monthTotals } from '../../../../utils/financials';

const report = {
  kpis: { tickets: 3, gross: 150, refunds: 50, net: 100, booking_fees: { collected: 20, refunded: 10, net: 10 } },
  daily: [
    { date: '2026-10-31', tickets: 1, net: 50, booking_fees: 10 },
    { date: '2026-11-01', tickets: 2, net: 50, booking_fees: 0 },
  ],
};
const tab = (extra = {}) => ({
  range: { from: '2026-10-01', to: '2026-11-06' },
  setRange: vi.fn(),
  report,
  loading: false,
  error: '',
  refunds: { data: [{ payment_id: 9, paid_at: '2026-11-05T01:00:00Z', transaction_reference: 'TX-9', total_paid: 60, payer: { name: 'Pia' }, trips: [{ route_name: 'Cabantian' }] }], meta: { page: 1, per_page: 20, total: 1, last_page: 1 } },
  setRefundPage: vi.fn(),
  ...extra,
});

describe('PaymentsPage', () => {
  it('shows fares and booking fees apart, by month and by day, and the refund-by-hand list', () => {
    render(<PaymentsPage paymentsTab={tab()} today="2026-11-06" />);
    expect(within(screen.getByRole('region', { name: 'Booking fees' })).getByText('Booking fees kept').closest('div').parentElement).toHaveTextContent('10.00');
    expect(within(screen.getByRole('region', { name: 'Fares' })).getByText('Fares kept').closest('div').parentElement).toHaveTextContent('100.00');
    const months = screen.getByRole('table', { name: 'By month' });
    expect(within(months).getByText('2026-10')).toBeInTheDocument();
    expect(within(months).getByText('2026-11')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Payments to refund by hand' })).getByText('TX-9')).toBeInTheDocument();
  });

  it('changes the dates with a preset', () => {
    const t = tab();
    render(<PaymentsPage paymentsTab={t} today="2026-11-06" />);
    fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));
    expect(t.setRange).toHaveBeenCalledWith({ from: '2026-10-31', to: '2026-11-06' });
  });

  it('adds up days per month, fares and fees apart', () => {
    expect(monthTotals([
      { date: '2026-10-30', tickets: 1, net: 10.1, booking_fees: 10 },
      { date: '2026-10-31', tickets: 2, net: 20.2, booking_fees: 0 },
      { date: '2026-11-01', tickets: 1, net: 5, booking_fees: 10 },
    ])).toEqual([
      { month: '2026-10', tickets: 3, net: 30.3, booking_fees: 10 },
      { month: '2026-11', tickets: 1, net: 5, booking_fees: 10 },
    ]);
  });
});
