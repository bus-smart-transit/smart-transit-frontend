import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FinancePage from './FinancePage';

vi.mock('../Financials/FinancialsPage', () => ({ default: () => <div>Financial overview</div> }));
vi.mock('../Remittances/RemittancesPage', () => ({ default: () => <div>Remittances</div> }));
vi.mock('../Refunds/PaymentRefundsPage', () => ({ default: () => <div>Refunds</div> }));

describe('FinancePage onsite discount settings', () => {
  it('loads types from the server and toggles availability through the Operator API', async () => {
    const student = { key: 'student', label: 'Student', rate: 0.2, active: true };
    const service = {
      getDiscountTypes: vi.fn().mockResolvedValue({ data: [student] }),
      setDiscountTypeActive: vi.fn().mockResolvedValue({ data: { ...student, active: false } }),
      getFinancials: vi.fn().mockResolvedValue({ data: { discounts: { total: 0, tickets: 0, by_type: [] } } }),
      getFinancialDiscountClaims: vi.fn().mockResolvedValue({ data: { rows: [], totals: { claims: 0, claimed: 0, approved: 0, rejected: 0, lapsed: 0, refunded: 0, refund_pending: 0 } } }),
    };

    render(<FinancePage
      views={[{ key: 'overview', label: 'Overview' }, { key: 'discounts', label: 'Discounts' }]}
      view="discounts"
      onViewChange={vi.fn()}
      service={service}
    />);

    expect(await screen.findByText('Student')).toBeInTheDocument();
    const activeToggle = screen.getByRole('checkbox', { name: 'Active' });
    expect(activeToggle).toBeChecked();
    fireEvent.click(activeToggle);

    await waitFor(() => expect(service.setDiscountTypeActive).toHaveBeenCalledWith('student', false));
    expect(await screen.findByRole('checkbox', { name: 'Inactive' })).not.toBeChecked();
  });
});

// Batch 81 (user, 2026-11-19): the Discounts tab also shows the onsite discounts given and the online claims.
describe('FinancePage Discounts tab', () => {
  it('shows the onsite discounts by type and each online claim with its outcome and refund', async () => {
    const service = {
      getDiscountTypes: vi.fn().mockResolvedValue({ data: [] }),
      setDiscountTypeActive: vi.fn(),
      getFinancials: vi.fn().mockResolvedValue({ data: { discounts: { total: 14, tickets: 2, by_type: [{ type_key: 'senior', label: 'Senior citizen', rate: 0.2, tickets: 2, amount: 14 }] } } }),
      getFinancialDiscountClaims: vi.fn().mockResolvedValue({ data: {
        rows: [{ id: 1, ticket_id: 5, ticket_code: '3F9A12BC', trip_id: 9, trip_date: '2026-11-18', departure_time: '12:20 PM', route_name: 'Ecoland - Tagum', label: 'Student', rate: 0.2, status: 'approved', fare: 152, refund_amount: 30, refund_status: 'succeeded', reviewed_at: '2026-11-18 11:51' }],
        totals: { claims: 1, claimed: 0, approved: 1, rejected: 0, lapsed: 0, refunded: 30, refund_pending: 0 },
      } }),
    };
    render(<FinancePage views={[{ key: 'discounts', label: 'Discounts' }]} view="discounts" onViewChange={vi.fn()} service={service} />);

    const claims = await screen.findByTestId('discount-claims');
    expect(claims).toHaveTextContent('Ecoland - Tagum');
    expect(claims).toHaveTextContent('Approved');
    expect(claims).toHaveTextContent('Refunded');
    expect(claims).toHaveTextContent('30.00');
    expect(screen.getByRole('region', { name: 'Onsite discounts by type' })).toHaveTextContent('Senior citizen');
    expect(screen.getByText('Refunded to e-wallets').closest('div')).toBeInTheDocument();
    expect(service.getFinancialDiscountClaims).toHaveBeenCalledWith(expect.objectContaining({ from: expect.any(String), to: expect.any(String) }));
  });
});
