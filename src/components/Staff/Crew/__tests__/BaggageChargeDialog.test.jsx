import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BaggageChargeDialog from '../BaggageChargeDialog';

// 2026-11-25 (user): the Chauffeur records baggage paid in cash on board, by size. SAMPLE prices.
const FEES = [
  { key: 'small', label: 'Small', hint: 'A bag or a small box', amount: 20 },
  { key: 'medium', label: 'Medium', hint: 'A sack, a big box or a large suitcase', amount: 50 },
  { key: 'large', label: 'Large', hint: 'An appliance or a very big load', amount: 100 },
];

describe('BaggageChargeDialog', () => {
  it('shows the pick-up stop, the prices, and records the chosen size with the stub number', async () => {
    const onRecord = vi.fn().mockResolvedValue(true);
    render(<BaggageChargeDialog target={{ ticket_id: 5, passenger_name: 'Ana', origin_stop: 'Terminal', baggage: true, baggage_charges: [] }} fees={FEES} onRecord={onRecord} onTakeBack={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText(/Pick-up: Terminal/)).toHaveTextContent('Said they bring baggage');
    expect(screen.getByTestId('baggage-save')).toBeDisabled();
    fireEvent.click(screen.getByTestId('baggage-size-medium'));
    fireEvent.change(screen.getByTestId('baggage-stub'), { target: { value: ' 0042 ' } });
    expect(screen.getByTestId('baggage-save')).toHaveTextContent('Collected PHP 50.00');
    fireEvent.click(screen.getByTestId('baggage-save'));

    await waitFor(() => expect(onRecord).toHaveBeenCalledWith('medium', '0042'));
  });

  it('lists what was paid and lets the Chauffeur take one back', () => {
    const onTakeBack = vi.fn();
    render(<BaggageChargeDialog target={{ ticket_id: 5, passenger_name: 'Ana', baggage_charges: [{ baggage_charge_id: 9, size_label: 'Large', amount: 100, stub_number: '7' }] }} fees={FEES} onRecord={vi.fn()} onTakeBack={onTakeBack} onClose={vi.fn()} />);

    expect(screen.getByTestId('baggage-paid-list')).toHaveTextContent('Large · PHP 100.00 · Stub 7');
    fireEvent.click(screen.getByRole('button', { name: 'Take back' }));
    expect(onTakeBack).toHaveBeenCalledWith(9);
  });

  it('shows nothing without a passenger', () => {
    const { container } = render(<BaggageChargeDialog target={null} fees={FEES} onRecord={vi.fn()} onTakeBack={vi.fn()} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
