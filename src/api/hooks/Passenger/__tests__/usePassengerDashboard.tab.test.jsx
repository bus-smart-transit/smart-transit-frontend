import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import usePassengerDashboard from '../usePassengerDashboard';
import PassengerService from '../../../PassengerService/PassengerService';

// The ?tab= value in the address picks the passenger dashboard tab (2026-11-04: worked out while rendering
// instead of setState in an effect; same results as before).

let authState;

vi.mock('../../useAuth', () => ({
  useAuth: () => authState,
}));

const signedIn = () => ({ isAuthenticated: true, user: { name: 'Passenger One', email: 'p1@example.com' }, logout: vi.fn() });
const signedOut = () => ({ isAuthenticated: false, user: null, logout: vi.fn() });

function renderAt(entry) {
  const wrapper = ({ children }) => <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>;
  return renderHook(() => ({
    dash: usePassengerDashboard({ preloadMapView: vi.fn().mockResolvedValue(null) }),
    location: useLocation(),
  }), { wrapper });
}

describe('usePassengerDashboard ?tab= in the address', () => {
  beforeEach(() => {
    sessionStorage.clear();
    authState = signedIn();
    vi.spyOn(PassengerService, 'getDashboardSummary').mockResolvedValue({ data: { profile: {}, tickets: [], rewards: [], payments: [] } });
    vi.spyOn(PassengerService, 'getTickets').mockResolvedValue({ data: [] });
    vi.spyOn(PassengerService, 'getRewardsHistory').mockResolvedValue({ data: [] });
    vi.spyOn(PassengerService, 'getPaymentHistory').mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('opens the tab the address names for a signed-in passenger', () => {
    const { result } = renderAt('/passenger/dashboard?tab=tickets');
    expect(result.current.dash.visibleTab).toBe('tickets');
  });

  test('reads "account" as the profile tab, in any letter case', () => {
    const { result } = renderAt('/passenger/dashboard?tab=Account');
    expect(result.current.dash.visibleTab).toBe('profile');
  });

  test('keeps the dashboard for an unknown tab or no tab', () => {
    expect(renderAt('/passenger/dashboard?tab=nope').result.current.dash.visibleTab).toBe('dashboard');
    expect(renderAt('/passenger/dashboard').result.current.dash.visibleTab).toBe('dashboard');
  });

  test('shows the dashboard to a guest on a signed-in tab, then that tab once they sign in', () => {
    authState = signedOut();
    const { result, rerender } = renderAt('/passenger/dashboard?tab=rewards');
    expect(result.current.dash.activeTab).toBe('dashboard');
    expect(result.current.dash.visibleTab).toBe('dashboard');

    authState = signedIn();
    rerender();
    expect(result.current.dash.visibleTab).toBe('rewards');
  });

  test('a guest can open the map tab from the address', () => {
    authState = signedOut();
    const { result } = renderAt('/passenger/dashboard?tab=map');
    expect(result.current.dash.visibleTab).toBe('map');
  });

  test('sends the old ?tab=buy link to the booking page', async () => {
    const { result } = renderAt('/passenger/dashboard?tab=buy');
    await waitFor(() => expect(result.current.location.pathname).toBe('/passenger/book'));
  });

  test('a tab the passenger picks stays picked when the page renders again', () => {
    const { result, rerender } = renderAt('/passenger/dashboard?tab=tickets');
    act(() => {
      result.current.dash.handleTabChange({ key: 'rewards', protected: true });
    });
    rerender();
    expect(result.current.dash.visibleTab).toBe('rewards');
  });
});
