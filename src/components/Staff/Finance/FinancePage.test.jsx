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
    };

    render(<FinancePage
      views={[{ key: 'overview', label: 'Overview' }]}
      view="overview"
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