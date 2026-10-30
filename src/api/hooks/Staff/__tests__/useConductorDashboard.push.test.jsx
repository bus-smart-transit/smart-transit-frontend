import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Every ConductorService call answers with an empty list; the test only looks at registerFcmToken.
const service = vi.hoisted(() => {
  const calls = {};
  return new Proxy(calls, {
    get(target, name) {
      if (name === 'then') return undefined;
      if (!target[name]) target[name] = vi.fn().mockResolvedValue({ data: [] });
      return target[name];
    },
  });
});
const fcm = vi.hoisted(() => ({ initFcmAndGetToken: vi.fn() }));
vi.mock('../../../StaffService/ConductorService', () => ({ default: service }));
vi.mock('../../../../services/fcmService', () => fcm);

import { useConductorDashboardData } from '../useConductorDashboard';

const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;

// 2026-10-30: the Chauffeur's phone registers for push like the Driver's (it never did).
describe('useConductorDashboard push notifications', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("sends this phone's push token to the server once", async () => {
    fcm.initFcmAndGetToken.mockResolvedValue('phone-token-1');
    renderHook(() => useConductorDashboardData({ onLogout: vi.fn(), pairing: { paired: false } }), { wrapper });

    await waitFor(() => expect(service.registerFcmToken).toHaveBeenCalledWith('phone-token-1'));
    expect(service.registerFcmToken).toHaveBeenCalledTimes(1);
  });

  it('sends nothing when push is not available or refused', async () => {
    fcm.initFcmAndGetToken.mockResolvedValue(null);
    renderHook(() => useConductorDashboardData({ onLogout: vi.fn(), pairing: { paired: false } }), { wrapper });

    await waitFor(() => expect(fcm.initFcmAndGetToken).toHaveBeenCalled());
    expect(service.registerFcmToken).not.toHaveBeenCalled();
  });
});
