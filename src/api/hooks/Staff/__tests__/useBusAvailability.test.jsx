import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useBusAvailability from '../useBusAvailability';
import OperatorService from '../../../StaffService/OperatorService';

vi.mock('../../../StaffService/OperatorService', () => ({ default: { getBusAvailability: vi.fn() } }));

// 2026-11-21 (user, Dynamic Route Scheduling): which buses can take the trip being scheduled.
describe('useBusAvailability', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks nothing until the route, date and time are all chosen', () => {
    const { result } = renderHook(() => useBusAvailability({ routeId: '4', date: '2026-10-06', time: '' }));
    expect(result.current).toEqual({ ready: false, loading: false, buses: [], error: '' });
    expect(OperatorService.getBusAvailability).not.toHaveBeenCalled();
  });

  it('asks the server for that route, date and time, and gives its buses', async () => {
    OperatorService.getBusAvailability.mockResolvedValue({ data: [{ fleet_id: 1, plate_number: 'AAA-1', available: true }] });
    const { result } = renderHook(() => useBusAvailability({ routeId: '4', date: '2026-10-06', time: '08:00', serviceType: 'express' }));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(OperatorService.getBusAvailability).toHaveBeenCalledWith({ route_id: '4', trip_date: '2026-10-06', departure_time: '08:00', service_type: 'express' });
    expect(result.current.buses).toEqual([{ fleet_id: 1, plate_number: 'AAA-1', available: true }]);
  });

  it('says when availability could not be checked', async () => {
    OperatorService.getBusAvailability.mockRejectedValue(new Error('Server down'));
    const { result } = renderHook(() => useBusAvailability({ routeId: '4', date: '2026-10-06', time: '08:00' }));
    await waitFor(() => expect(result.current.error).toBe('Server down'));
  });
});
