import React from 'react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import usePassengerDashboard from '../usePassengerDashboard';
import PassengerService from '../../../PassengerService/PassengerService';

let authState = {
  isAuthenticated: true,
  user: { name: 'Passenger One', email: 'p1@example.com' },
  logout: vi.fn(),
};

vi.mock('../../useAuth', () => ({
  useAuth: () => authState,
}));

function createWrapper(initialEntry = '/') {
  return function Wrapper({ children }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

describe('usePassengerDashboard fetch regression', () => {
  let callCounts;

  beforeEach(() => {
    vi.useRealTimers();
    callCounts = {};
    sessionStorage.clear();

    vi.spyOn(PassengerService, 'getDashboardSummary').mockImplementation(async () => {
      callCounts.summary = (callCounts.summary || 0) + 1;
      return {
        data: {
          profile: { name: 'Passenger One' },
          tickets: [{ ticket_uuid: 'abc-1', status: 'valid', valid_from: new Date().toISOString() }],
          rewards: [],
          payments: [],
        },
      };
    });

    vi.spyOn(PassengerService, 'getTickets').mockImplementation(async () => {
      callCounts.tickets = (callCounts.tickets || 0) + 1;
      return { data: [] };
    });

    vi.spyOn(PassengerService, 'getRewardsHistory').mockImplementation(async () => {
      callCounts.rewards = (callCounts.rewards || 0) + 1;
      return { data: [] };
    });

    vi.spyOn(PassengerService, 'getPaymentHistory').mockImplementation(async () => {
      callCounts.payments = (callCounts.payments || 0) + 1;
      return { data: [] };
    });

    vi.spyOn(PassengerService, 'getTicketQR').mockImplementation(async () => {
      callCounts.ticketQr = (callCounts.ticketQr || 0) + 1;
      return { data: { qr_url: 'https://example.com/ticket-qr.png' } };
    });

    authState = {
      isAuthenticated: true,
      user: { name: 'Passenger One', email: 'p1@example.com' },
      logout: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('fetches dashboard summary once on authenticated mount', async () => {
    renderHook(() => usePassengerDashboard({ preloadMapView: vi.fn().mockResolvedValue(null) }), {
      wrapper: createWrapper('/'),
    });

    await waitFor(() => {
      expect(callCounts.summary || 0).toBe(1);
    });
  });

  test('does not duplicate private load when payment=success is present', async () => {
    renderHook(() => usePassengerDashboard({ preloadMapView: vi.fn().mockResolvedValue(null) }), {
      wrapper: createWrapper('/?payment=success'),
    });

    await waitFor(() => {
      expect(callCounts.summary || 0).toBe(1);
    });
  });

  test('does not re-fetch on unrelated rerender', async () => {
    const { rerender } = renderHook(({ marker }) => {
      const hook = usePassengerDashboard({ preloadMapView: vi.fn().mockResolvedValue(null) });
      return { hook, marker };
    }, {
      initialProps: { marker: 1 },
      wrapper: createWrapper('/'),
    });

    await waitFor(() => {
      expect(callCounts.summary || 0).toBe(1);
    });

    rerender({ marker: 2 });

    expect(callCounts.summary || 0).toBe(1);
  });

  test('auth transition false->true triggers exactly one new fetch', async () => {
    authState = {
      isAuthenticated: false,
      user: null,
      logout: vi.fn(),
    };

    const { rerender } = renderHook(({ tick }) => {
      const hook = usePassengerDashboard({ preloadMapView: vi.fn().mockResolvedValue(null) });
      return { hook, tick };
    }, {
      initialProps: { tick: 1 },
      wrapper: createWrapper('/'),
    });

    await waitFor(() => {
      expect(callCounts.summary || 0).toBe(0);
    });

    authState = {
      isAuthenticated: true,
      user: { name: 'Passenger One', email: 'p1@example.com' },
      logout: vi.fn(),
    };

    rerender({ tick: 2 });

    await waitFor(() => {
      expect(callCounts.summary || 0).toBe(1);
    });
  });

  test('ticket QR request is cached and not re-fetched for same ticket within TTL', async () => {
    const { result } = renderHook(() => usePassengerDashboard({ preloadMapView: vi.fn().mockResolvedValue(null) }), {
      wrapper: createWrapper('/'),
    });

    await waitFor(() => {
      expect(callCounts.summary || 0).toBe(1);
    });

    const ticket = { ticket_uuid: 'same-ticket-1', status: 'valid', valid_from: new Date().toISOString() };

    await act(async () => {
      await result.current.openTicketModal(ticket);
    });

    await waitFor(() => {
      expect(callCounts.ticketQr || 0).toBe(1);
    });

    await act(async () => {
      await result.current.openTicketModal(ticket);
    });

    expect(callCounts.ticketQr || 0).toBe(1);
  });

  test('falls back to tickets/rewards/payments when dashboard summary fails', async () => {
    PassengerService.getDashboardSummary.mockImplementationOnce(async () => {
      callCounts.summary = (callCounts.summary || 0) + 1;
      throw new Error('summary failed');
    });

    renderHook(() => usePassengerDashboard({ preloadMapView: vi.fn().mockResolvedValue(null) }), {
      wrapper: createWrapper('/'),
    });

    await waitFor(() => {
      expect(callCounts.summary || 0).toBe(1);
      expect(callCounts.tickets || 0).toBe(1);
      expect(callCounts.rewards || 0).toBe(1);
      expect(callCounts.payments || 0).toBe(1);
    });
  });
});
