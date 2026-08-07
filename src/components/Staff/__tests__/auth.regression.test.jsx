/**
 * Regression Tests — Auth/Authorization Bugs
 *
 * Bug 1: Stale token in localStorage must NOT redirect /employee/login to a dashboard.
 * Bug 2: Successful logins must NOT display a lockout/attempt-counter message.
 * Bug 3: A just-logged-in passenger must NOT be bounced to sign-in when clicking protected tabs.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Components & hooks under test
import { StaffGuestRoute } from '../../StaffAuthGuard';
import StaffLoginPage from '../StaffLoginPage';
import { AuthProvider } from '../../../api/hooks/contexts/AuthProvider';
import usePassengerDashboard from '../../../api/hooks/Passenger/usePassengerDashboard';

// Services mocked per-suite
import StaffService from '../../../api/StaffService/StaffService';
import PassengerService from '../../../api/PassengerService/PassengerService';

// ─── Storage mock (shared across all suites) ─────────────────────────────────
// Node 26 ships a native `localStorage` global that is undefined without
// --localstorage-file. jsdom cannot replace it because it is non-configurable.
// We stub it globally here so all source files that call localStorage.xxx work.

function makeStorageMock() {
  const store = Object.create(null);
  return {
    getItem:    (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem:    (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear:      () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
}

let _ls, _ss;
beforeEach(() => {
  _ls = makeStorageMock();
  _ss = makeStorageMock();
  vi.stubGlobal('localStorage', _ls);
  vi.stubGlobal('sessionStorage', _ss);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function clearAllStorage() {
  localStorage?.clear();
  sessionStorage?.clear();
}

// ─── Bug 1: StaffGuestRoute must not redirect on stale/invalid token ─────────

describe('Bug 1 — StaffGuestRoute: stale token does not redirect to dashboard', () => {
  beforeEach(() => {
    clearAllStorage();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAllStorage();
  });

  test('no token in storage → shows login page, fetch not called', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 401 });

    render(
      <MemoryRouter initialEntries={['/employee/login']}>
        <Routes>
          <Route element={<StaffGuestRoute />}>
            <Route path="/employee/login" element={<div data-testid="login-page">Login</div>} />
          </Route>
          <Route path="/employee/operator/dashboard" element={<div data-testid="operator-dashboard">Operator</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Brief loading state while validating, then resolves to login
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('operator-dashboard')).not.toBeInTheDocument();
    // fetch should not have been called (no token to validate)
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('stale token in localStorage (backend returns 401) → stays on login page', async () => {
    localStorage.setItem('staff_token', 'expired-token-abc123');
    localStorage.setItem('staff_role', 'operator');
    global.fetch.mockResolvedValue({ ok: false, status: 401 });

    render(
      <MemoryRouter initialEntries={['/employee/login']}>
        <Routes>
          <Route element={<StaffGuestRoute />}>
            <Route path="/employee/login" element={<div data-testid="login-page">Login</div>} />
          </Route>
          <Route path="/employee/operator/dashboard" element={<div data-testid="operator-dashboard">Operator</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Shows loading, then stays on login
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('operator-dashboard')).not.toBeInTheDocument();

    // Stale token should have been cleared
    expect(localStorage.getItem('staff_token')).toBeNull();
    expect(localStorage.getItem('staff_role')).toBeNull();
  });

  test('valid token (backend returns 200) → redirects to role dashboard', async () => {
    localStorage.setItem('staff_token', 'valid-token-xyz');
    localStorage.setItem('staff_role', 'driver');
    global.fetch.mockResolvedValue({ ok: true, status: 200 });

    render(
      <MemoryRouter initialEntries={['/employee/login']}>
        <Routes>
          <Route element={<StaffGuestRoute />}>
            <Route path="/employee/login" element={<div data-testid="login-page">Login</div>} />
          </Route>
          <Route path="/employee/driver/dashboard" element={<div data-testid="driver-dashboard">Driver Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('driver-dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  test('network error during validation → stays on login page (fail-safe)', async () => {
    localStorage.setItem('staff_token', 'some-token');
    localStorage.setItem('staff_role', 'conductor');
    global.fetch.mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter initialEntries={['/employee/login']}>
        <Routes>
          <Route element={<StaffGuestRoute />}>
            <Route path="/employee/login" element={<div data-testid="login-page">Login</div>} />
          </Route>
          <Route path="/employee/conductor/dashboard" element={<div data-testid="conductor-dashboard">Conductor</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('conductor-dashboard')).not.toBeInTheDocument();
  });
});

// ─── Bug 2: Successful login resets failed-attempt counter ───────────────────
// These tests exercise the frontend side (counter not displayed after success).
// The backend RateLimiter.clear() logic is validated through integration tests;
// here we confirm the frontend shows NO lockout message after a clean login.

describe('Bug 2 — Successful login does not display lockout/attempt message', () => {
  beforeEach(() => {
    clearAllStorage();
    vi.spyOn(StaffService, 'login').mockResolvedValue({
      data: {
        token: 'fresh-valid-token',
        user: { role: 'driver' },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAllStorage();
  });

  test('clean login shows no error/attempt message in the UI', async () => {
    render(
      <MemoryRouter>
        <StaffLoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/smarttransit\.com/i), {
      target: { value: 'driver@smarttransit.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter password/i), {
      target: { value: 'password123' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });

    // No error/attempt UI should be visible after a successful login
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/attempt/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/too many/i)).not.toBeInTheDocument();
  });

  test('failed login then successful login clears the error', async () => {
    // First call fails, second call succeeds
    StaffService.login
      .mockRejectedValueOnce(new Error('Invalid email or password credentials provided.'))
      .mockResolvedValueOnce({
        data: { token: 'fresh-token', user: { role: 'driver' } },
      });

    render(
      <MemoryRouter>
        <StaffLoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/smarttransit\.com/i);
    const passwordInput = screen.getByPlaceholderText(/enter password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    // Attempt 1 — wrong password
    fireEvent.change(emailInput, { target: { value: 'driver@smarttransit.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    await act(async () => { fireEvent.click(submitBtn); });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Attempt 2 — correct password
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    await act(async () => { fireEvent.click(submitBtn); });

    // Error message should be gone after successful login
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/too many/i)).not.toBeInTheDocument();
  });
});

// ─── Bug 3: Logged-in passenger can access protected tabs without redirect ────

// Lightweight stand-in for Dashboard; tests only the handleTabChange logic
function TestPassengerConsumer({ tabKey, isProtected }) {
  const { handleTabChange, visibleTab, isAuthenticated: authState } = usePassengerDashboard({
    preloadMapView: () => {},
  });

  return (
    <div>
      <span data-testid="visible-tab">{visibleTab}</span>
      <span data-testid="auth-state">{String(authState)}</span>
      <button
        data-testid="tab-btn"
        onClick={() => handleTabChange({ key: tabKey, protected: isProtected })}
      >
        Go to {tabKey}
      </button>
    </div>
  );
}

function renderWithAuth(ui, { mockLoginToken = null } = {}) {
  if (mockLoginToken) {
    // Write token to the stubbed sessionStorage so AuthProvider's useState
    // initialiser reads it as authenticated.
    sessionStorage.setItem('passenger_token', mockLoginToken);
  }

  return render(
    <MemoryRouter initialEntries={['/passenger/dashboard']}>
      <AuthProvider role="passenger">
        <Routes>
          <Route path="/passenger/dashboard" element={ui} />
          <Route path="/passenger/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Bug 3 — Logged-in passenger accesses protected tabs without redirect', () => {
  beforeEach(() => {
    vi.spyOn(PassengerService, 'getProfile').mockResolvedValue({
      data: { name: 'Test Passenger', reward_points: 0 },
    });
    vi.spyOn(PassengerService, 'getDashboardSummary').mockResolvedValue({
      data: { profile: {}, tickets: [], rewards: [], payments: [] },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('authenticated passenger clicking tickets tab stays on dashboard (no redirect)', async () => {
    renderWithAuth(
      <TestPassengerConsumer tabKey="tickets" isProtected={true} />,
      { mockLoginToken: 'passenger-valid-token' }
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('true');
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('tab-btn'));
    });

    // Should show tickets tab, NOT redirect to login
    await waitFor(() => {
      expect(screen.getByTestId('visible-tab').textContent).toBe('tickets');
    });
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  test('getProfile 404 does NOT log the user out (Bug 3 fix validation)', async () => {
    // Simulate profile endpoint returning 404 (no passenger profile record)
    const notFoundErr = new Error('Not found');
    notFoundErr.response = { status: 404 };
    notFoundErr.cause = { response: { status: 404 } };
    PassengerService.getProfile.mockRejectedValue(notFoundErr);

    renderWithAuth(
      <TestPassengerConsumer tabKey="rewards" isProtected={true} />,
      { mockLoginToken: 'passenger-valid-token' }
    );

    // isAuthenticated should remain true — 404 is NOT a logout trigger
    await waitFor(() => {
      // Auth state must not flip to false on a 404 profile error
      expect(screen.getByTestId('auth-state').textContent).toBe('true');
    });

    // User can still navigate to protected tab
    await act(async () => {
      fireEvent.click(screen.getByTestId('tab-btn'));
    });
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  test('getProfile 401 DOES log the user out (token-expired scenario)', async () => {
    const unauthorizedErr = new Error('Unauthorized');
    unauthorizedErr.response = { status: 401 };
    unauthorizedErr.cause = { response: { status: 401 } };
    PassengerService.getProfile.mockRejectedValue(unauthorizedErr);

    renderWithAuth(
      <TestPassengerConsumer tabKey="tickets" isProtected={true} />,
      { mockLoginToken: 'expired-token' }
    );

    // After the 401, auth should be cleared
    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('false');
    });

    // Attempting a protected tab should redirect to login
    await act(async () => {
      fireEvent.click(screen.getByTestId('tab-btn'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });
});
