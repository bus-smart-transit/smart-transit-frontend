import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('../../../services/fcmService', () => ({
  initFcmAndGetToken: vi.fn().mockResolvedValue(null),
  stopForegroundListener: vi.fn(),
}));

vi.mock('../../StaffService/OperatorService', () => {
  const ok = (data = []) => vi.fn().mockResolvedValue({ data });
  return {
    default: {
      getProfile: ok({ name: 'Olive Operator', role: 'operator' }),
      getOperatorTrips: ok(),
      getOperatorDrivers: ok(),
      getOperatorConductors: ok(),
      getOperatorFleets: ok(),
      getOperatorRoutes: ok(),
      getOperatorStops: ok(),
      registerFcmToken: ok(),
      logoutOperator: ok(),
      createEmployeeAccount: ok(),
    },
  };
});

import { useOperatorDashboardData } from '../../../api/hooks/Staff/useOperatorDashboard';

function setup(search) {
  window.history.pushState({}, '', `/employee/operator/dashboard${search}`);
  const wrapper = ({ children }) => <MemoryRouter initialEntries={[`/employee/operator/dashboard${search}`]}>{children}</MemoryRouter>;
  return renderHook(() => ({ dash: useOperatorDashboardData(), location: useLocation() }), { wrapper });
}

describe('Operator navigation state and address (Batch 30)', () => {
  it.each([
    ['?tab=trips&trip=9', 'schedule', 'trips', '?tab=schedule&trip=9&view=trips'],
    ['?tab=calendar', 'schedule', 'calendar', '?tab=schedule&view=calendar'],
    ['?tab=shiftBlocks', 'schedule', 'blocks', '?tab=schedule&view=blocks'],
    ['?tab=financials', 'finance', 'overview', '?tab=finance&view=overview'],
    ['?tab=remittances', 'finance', 'remittances', '?tab=finance&view=remittances'],
  ])('%s opens %s / %s and the address is rewritten', async (search, tab, view, rewritten) => {
    const { result } = setup(search);
    expect(result.current.dash.activeTab).toBe(tab);
    expect(result.current.dash.view).toBe(view);
    await waitFor(() => expect(result.current.location.search).toBe(rewritten));
  });

  it('opens the Dashboard when there is no usable tab', async () => {
    const { result } = setup('?tab=bogus');
    expect(result.current.dash.activeTab).toBe('dashboard');
    expect(result.current.dash.view).toBeNull();
  });

  it('choosing a sidebar item opens its first view, and a view change keeps the item', async () => {
    const { result } = setup('');
    await waitFor(() => expect(result.current.dash.loading).toBe(false));

    act(() => result.current.dash.setActiveTab('finance'));
    expect(result.current.dash.activeTab).toBe('finance');
    expect(result.current.dash.view).toBe('overview');
    await waitFor(() => expect(result.current.location.search).toBe('?tab=finance&view=overview'));

    act(() => result.current.dash.setView('transactions'));
    expect(result.current.dash.activeTab).toBe('finance');
    await waitFor(() => expect(result.current.location.search).toBe('?tab=finance&view=transactions'));

    act(() => result.current.dash.setActiveTab('reports'));
    expect(result.current.dash.view).toBeNull();
    await waitFor(() => expect(result.current.location.search).toBe('?tab=reports'));
  });

  it('opens a given view directly (the dashboard calendar widget opens Schedule on Calendar)', async () => {
    const { result } = setup('');
    await waitFor(() => expect(result.current.dash.loading).toBe(false));
    act(() => result.current.dash.setActiveTab('schedule', 'calendar'));
    expect(result.current.dash.view).toBe('calendar');
  });
});
