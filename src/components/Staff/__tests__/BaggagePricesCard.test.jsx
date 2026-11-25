import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BaggagePricesCard from '../BaggagePricesCard';

// 2026-11-25 (user): the Operator's baggage prices by size. SAMPLE prices.
const TONE = { rule: '', title: '', muted: '', field: '', ok: '', bad: '' };
const FEES = [
  { key: 'small', label: 'Small', hint: 'A bag', amount: 20 },
  { key: 'medium', label: 'Medium', hint: 'A sack', amount: 50 },
  { key: 'large', label: 'Large', hint: 'An appliance', amount: 100 },
];

describe('BaggagePricesCard', () => {
  it('shows the prices and saves new ones', async () => {
    const save = vi.fn().mockResolvedValue({ ok: true, fees: FEES.map((fee) => (fee.key === 'medium' ? { ...fee, amount: 60 } : fee)) });
    render(<BaggagePricesCard load={() => Promise.resolve(FEES)} save={save} tone={TONE} />);

    expect(await screen.findByText('PHP 50.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit prices' }));
    fireEvent.change(screen.getByLabelText('Medium baggage price'), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save prices' }));

    await waitFor(() => expect(save).toHaveBeenCalledWith({ small: 20, medium: 60, large: 100 }));
    expect(await screen.findByText('PHP 60.00')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Baggage prices saved.');
  });

  it('cannot save an empty price, and a read-only Operator cannot edit', async () => {
    const { unmount } = render(<BaggagePricesCard load={() => Promise.resolve(FEES)} save={vi.fn()} tone={TONE} />);
    await screen.findByText('PHP 20.00');
    fireEvent.click(screen.getByRole('button', { name: 'Edit prices' }));
    fireEvent.change(screen.getByLabelText('Small baggage price'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Save prices' })).toBeDisabled();
    unmount();

    render(<BaggagePricesCard load={() => Promise.resolve(FEES)} save={vi.fn()} tone={TONE} readOnly />);
    await screen.findByText('PHP 20.00');
    expect(screen.queryByRole('button', { name: 'Edit prices' })).toBeNull();
  });
});
