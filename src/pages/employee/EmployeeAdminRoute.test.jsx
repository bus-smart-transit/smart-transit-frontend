import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TokenManager } from '../../utils/TokenManager.js';
import EmployeeBaseRouter from './index';

vi.mock('../../components/Staff/Admin/SuperAdminPortal', () => ({ default: () => <div data-testid="super-admin-portal">Super Admin portal</div> }));

function makeStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
}

describe('Employee Admin route', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeStorage());
    vi.stubGlobal('sessionStorage', makeStorage());
  });

  afterEach(() => {
    TokenManager.clearStaffSession();
    vi.unstubAllGlobals();
  });

  const renderAt = (path) => render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/employee/*" element={<EmployeeBaseRouter />} />
      </Routes>
    </MemoryRouter>,
  );

  it('opens the Super Admin portal behind the Admin role guard', async () => {
    TokenManager.setStaffSession('admin-token', 'admin');

    renderAt('/employee/admin/dashboard');
    expect(await screen.findByTestId('super-admin-portal')).toBeInTheDocument();
  });

  it('keeps an Operator out of the Super Admin portal', async () => {
    TokenManager.setStaffSession('operator-token', 'operator');

    renderAt('/employee/admin/dashboard');
    await screen.findByText(/./);
    expect(screen.queryByTestId('super-admin-portal')).toBeNull();
  });
});
