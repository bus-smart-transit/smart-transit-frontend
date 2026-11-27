import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../services/bookingService', () => ({
  getBookingStops: vi.fn(),
  getDepartures: vi.fn(),
  resolveTrip: vi.fn(),
  getTrips: vi.fn(),
  readApiError: (error, fallback) => ({ message: error?.message || fallback, fieldErrors: {} }),
}));

import { getTrips } from '../../../../services/bookingService';
import { TRIPS_REFRESH_MS, useAvailableTrips } from '../useBookingSearch';

// 2026-11-27 (user): a trip scheduled after the home page opened must show up without a reload. SAMPLE trip.
describe('useAvailableTrips refresh', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); });
  afterEach(() => vi.useRealTimers());

  it('asks again every minute and shows a trip scheduled meanwhile, keeping the list while it asks', async () => {
    getTrips.mockResolvedValueOnce({ trips: [], total: 0 }).mockResolvedValue({ trips: [{ trip_id: 202 }], total: 1 });
    const { result } = renderHook(() => useAvailableTrips({ date: '2026-11-26' }));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.total).toBe(0);
    expect(result.current.loading).toBe(false);

    await act(async () => { vi.advanceTimersByTime(TRIPS_REFRESH_MS); await Promise.resolve(); });
    expect(result.current.loading).toBe(false);
    expect(result.current.trips).toEqual([{ trip_id: 202 }]);
    expect(getTrips).toHaveBeenCalledTimes(2);
  });

  it('asks again when the passenger comes back to the tab', async () => {
    getTrips.mockResolvedValue({ trips: [], total: 0 });
    renderHook(() => useAvailableTrips({ date: '2026-11-26' }));
    await act(async () => { await Promise.resolve(); });
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); await Promise.resolve(); });
    expect(getTrips).toHaveBeenCalledTimes(2);
  });
});
