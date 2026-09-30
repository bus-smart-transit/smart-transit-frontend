import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../services/bookingService', () => ({ getPaymentStatus: vi.fn() }));

import { getPaymentStatus } from '../../../services/bookingService';
import CheckoutReturn from './CheckoutReturn';

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <CheckoutReturn />
  </MemoryRouter>,
);

// Node's experimental global localStorage shadows jsdom's in this runner; use a plain in-memory store.
const memory = new Map();
const fakeStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => { memory.set(k, String(v)); },
  removeItem: (k) => { memory.delete(k); },
  clear: () => memory.clear(),
};

const storedEvent = () => JSON.parse(fakeStorage.getItem('smart_transit_checkout_event') || 'null');

describe('CheckoutReturn (C4: the webhook decides, the return URL only refreshes the UI)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', fakeStorage);
    fakeStorage.clear();
  });

  test('a redirect to success is shown as completed only once the server says paid', async () => {
    getPaymentStatus.mockResolvedValue({ status: 'paid' });
    renderAt('/checkout/success?ref=TXN-1');

    expect(screen.getByText(/confirming your payment/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Payment Completed')).toBeInTheDocument());
    expect(getPaymentStatus).toHaveBeenCalledWith('TXN-1');
    expect(storedEvent().status).toBe('success');
  });

  test.each([
    ['failed', 'Payment Failed'],
    ['expired', 'Payment Session Expired'],
  ])('shows %s from the recorded state', async (status, title) => {
    getPaymentStatus.mockResolvedValue({ status });
    renderAt('/checkout/success?ref=TXN-2');

    await waitFor(() => expect(screen.getByText(title)).toBeInTheDocument());
    expect(storedEvent().status).toBe(status);
  });

  test('the cancel redirect reads as cancelled while nothing is recorded yet', async () => {
    getPaymentStatus.mockResolvedValue({ status: 'pending' });
    renderAt('/checkout/cancel?ref=TXN-3');

    await waitFor(() => expect(screen.getByText('Payment Cancelled')).toBeInTheDocument());
    expect(storedEvent().status).toBe('cancel');
  });

  test('a success redirect without a reference is never treated as confirmed', async () => {
    renderAt('/checkout/success');

    await waitFor(() => expect(screen.getByText('Still Confirming')).toBeInTheDocument());
    expect(getPaymentStatus).not.toHaveBeenCalled();
    expect(storedEvent().status).toBe('pending');
  });
});
