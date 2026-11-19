import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DiscountReviewDialog from '../DiscountReviewDialog';

// Batch 75: the Chauffeur checks the ID of a passenger who claimed a discount online (SAMPLE fare).
const target = { ticketId: 7, passengerName: 'Pax One', claim: { label: 'Student', rate: 0.2, fare: 47, status: 'claimed' } };

describe('DiscountReviewDialog (Batch 75)', () => {
  it('shows the claim and the fare with the discount, and sends the decision', () => {
    const onDecide = vi.fn();
    render(<DiscountReviewDialog target={target} onDecide={onDecide} onClose={vi.fn()} />);

    expect(screen.getByText('Pax One')).toBeInTheDocument();
    expect(screen.getByText(/Ask for a valid Student ID/)).toBeInTheDocument();
    expect(screen.getByText('PHP 47.00')).toBeInTheDocument();
    expect(screen.getByText('about PHP 38.00')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('discount-approve'));
    fireEvent.click(screen.getByTestId('discount-reject'));
    expect(onDecide.mock.calls).toEqual([['approve'], ['reject']]);
  });

  it('shows nothing without a claim, and the server message on an error', () => {
    const { container, rerender } = render(<DiscountReviewDialog target={null} onDecide={vi.fn()} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<DiscountReviewDialog target={target} error="This discount was already reviewed." onDecide={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('This discount was already reviewed.');
  });
});
