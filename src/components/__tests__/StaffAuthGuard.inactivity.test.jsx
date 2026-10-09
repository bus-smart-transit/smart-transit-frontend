import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../../api/StaffService/StaffBaseService', () => ({
  default: { logout: vi.fn().mockResolvedValue({}), getProfile: vi.fn().mockResolvedValue({}) },
}));

import StaffService from '../../api/StaffService/StaffBaseService';
import { StaffProtectedRoute } from '../StaffAuthGuard';

// The Operator portal signs out after 30 minutes with nobody touching the screen. Driver and Chauffeur screens do not:
// the Driver's phone sends GPS and the Chauffeur's shift runs with nobody touching the screen.

function Login() {
  const notice = useLocation().state?.notice;
  return <div>login page|{notice || 'no notice'}</div>;
}

const renderPortal = (role) => {
  sessionStorage.setItem('staff_token', 'token-123');
  sessionStorage.setItem('staff_role', role);

  return render(
    <MemoryRouter initialEntries={[`/employee/${role}/dashboard`]}>
      <Routes>
        <Route element={<StaffProtectedRoute allowedRoles={[role]} />}>
          <Route path={`/employee/${role}/dashboard`} element={<div>{role} dashboard</div>} />
        </Route>
        <Route path="/employee/login" element={<Login />} />
      </Routes>
    </MemoryRouter>,
  );
};

const minutes = (n) => n * 60 * 1000;

// Node's experimental global localStorage shadows jsdom's in this runner; use a plain in-memory store.
const memory = new Map();
const fakeStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => { memory.set(k, String(v)); },
  removeItem: (k) => { memory.delete(k); },
  clear: () => memory.clear(),
};

describe('staff portal inactivity sign-out', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', fakeStorage);
    fakeStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  test('signs an Operator out after 30 idle minutes, ends the session on the server, and says why on the sign-in page', () => {
    renderPortal('operator');
    expect(screen.getByText('operator dashboard')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(minutes(29)); });
    expect(screen.getByText('operator dashboard')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(minutes(2)); });
    expect(screen.getByText(/login page\|You were signed out after 30 minutes without activity/)).toBeInTheDocument();
    expect(StaffService.logout).toHaveBeenCalledWith('operator');
    expect(sessionStorage.getItem('staff_token')).toBeNull();
    expect(sessionStorage.getItem('staff_role')).toBeNull();
  });

  test('activity keeps the Operator signed in: the 30 minutes start again from the last touch', () => {
    renderPortal('operator');

    act(() => { vi.advanceTimersByTime(minutes(25)); });
    fireEvent.keyDown(window, { key: 'a' });
    act(() => { vi.advanceTimersByTime(minutes(25)); });

    expect(screen.getByText('operator dashboard')).toBeInTheDocument();
    expect(StaffService.logout).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(minutes(10)); });
    expect(screen.getByText(/login page\|You were signed out/)).toBeInTheDocument();
  });

  test.each(['driver', 'conductor'])('never signs a %s out for being idle', (role) => {
    renderPortal(role);

    act(() => { vi.advanceTimersByTime(minutes(8 * 60)); });

    expect(screen.getByText(`${role} dashboard`)).toBeInTheDocument();
    expect(StaffService.logout).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('staff_token')).toBe('token-123');
  });

  test('a person who is simply not signed in goes to the sign-in page with no notice', () => {
    render(
      <MemoryRouter initialEntries={['/employee/operator/dashboard']}>
        <Routes>
          <Route element={<StaffProtectedRoute allowedRoles={['operator']} />}>
            <Route path="/employee/operator/dashboard" element={<div>operator dashboard</div>} />
          </Route>
          <Route path="/employee/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('login page|no notice')).toBeInTheDocument();
  });
});
