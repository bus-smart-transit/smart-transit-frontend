import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TicketCard from './TicketCard';

// The "New tracking link" action replaces a link that got out. It cuts off the old link for everyone, so it asks first.

vi.mock('./QrImage', () => ({ default: () => <div>qr</div> }));

const renderCard = (props = {}) => render(
  <MemoryRouter>
    <TicketCard fromLabel="Stop B" toLabel="Stop D" statusLabel="valid" qrContent="abc" trackingToken="tok-123" {...props} />
  </MemoryRouter>,
);

describe('TicketCard: replacing the tracking link', () => {
  test('shows the original fare, onsite discount, ID verification, and paid fare when present', () => {
    renderCard({
      discountLabel: 'Student',
      originalFare: 100,
      discountAmount: 20,
      discountVerified: true,
      farePaid: 80,
    });

    expect(screen.getByText('Original fare')).toBeInTheDocument();
    expect(screen.getByText('PHP 100.00')).toBeInTheDocument();
    expect(screen.getByText('Student discount')).toBeInTheDocument();
    expect(screen.getByText('- PHP 20.00')).toBeInTheDocument();
    expect(screen.getByText('Verified by Chauffeur')).toBeInTheDocument();
    expect(screen.getByText('Fare paid')).toBeInTheDocument();
    expect(screen.getByText('PHP 80.00')).toBeInTheDocument();
  });

  test('has no such button unless the owner can renew (for example, a ticket shown right after a guest purchase)', () => {
    renderCard();
    expect(screen.queryByRole('button', { name: 'New tracking link' })).toBeNull();
  });

  test('asks before replacing, says what it does, and leaves the QR code out of it', () => {
    const onRenewLink = vi.fn().mockResolvedValue();
    renderCard({ onRenewLink });

    fireEvent.click(screen.getByRole('button', { name: 'New tracking link' }));

    const box = screen.getByRole('group', { name: 'Replace tracking link' });
    expect(box).toHaveTextContent('The old link stops working at once');
    expect(box).toHaveTextContent('QR code is not affected');
    expect(onRenewLink).not.toHaveBeenCalled();
  });

  test('keeping the old link closes the question and changes nothing', () => {
    const onRenewLink = vi.fn();
    renderCard({ onRenewLink });

    fireEvent.click(screen.getByRole('button', { name: 'New tracking link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep the old link' }));

    expect(screen.queryByRole('group', { name: 'Replace tracking link' })).toBeNull();
    expect(screen.getByRole('button', { name: 'New tracking link' })).toBeInTheDocument();
    expect(onRenewLink).not.toHaveBeenCalled();
  });

  test('replaces the link once confirmed, then goes back to the normal buttons', async () => {
    const onRenewLink = vi.fn().mockResolvedValue();
    renderCard({ onRenewLink });

    fireEvent.click(screen.getByRole('button', { name: 'New tracking link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace link' }));

    await waitFor(() => expect(onRenewLink).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('group', { name: 'Replace tracking link' })).toBeNull());
    expect(screen.getByRole('button', { name: 'New tracking link' })).toBeInTheDocument();
  });

  test('shows the server message and lets the passenger try again when it fails', async () => {
    const onRenewLink = vi.fn().mockRejectedValueOnce(new Error('This ticket can no longer be tracked.')).mockResolvedValueOnce();
    renderCard({ onRenewLink });

    fireEvent.click(screen.getByRole('button', { name: 'New tracking link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace link' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This ticket can no longer be tracked.');
    fireEvent.click(screen.getByRole('button', { name: 'Replace link' }));
    await waitFor(() => expect(onRenewLink).toHaveBeenCalledTimes(2));
  });

  test('is not offered for a ticket that can no longer be tracked', () => {
    renderCard({ onRenewLink: vi.fn(), statusLabel: 'cancelled' });
    expect(screen.queryByRole('button', { name: 'New tracking link' })).toBeNull();
  });
});
