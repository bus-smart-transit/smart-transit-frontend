import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TokenManager } from '../../utils/TokenManager.js';
import EmployeeBaseRouter from './index';

vi.mock('../../components/Staff/AdminPanel', () => ({ default: () => <div data-testid="admin-panel">Admin panel</div> }));

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

  it('mounts the existing AdminPanel behind the Admin role guard', async () => {
    TokenManager.setStaffSession('admin-token', 'admin');

    render(
      <MemoryRouter initialEntries={['/employee/admin/dashboard']}>
        <Routes>
          <Route path="/employee/*" element={<EmployeeBaseRouter />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('admin-panel')).toBeInTheDocument();
  });
});