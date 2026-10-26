import { describe, expect, test, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

vi.mock('../../../StaffService/OperatorService', () => ({
  default: {
    getOperatorFleetRoutes: vi.fn(),
    getOperatorTrips: vi.fn(),
    createShiftBlock: vi.fn(),
    previewShiftBlockRange: vi.fn(),
    createShiftBlockRange: vi.fn(),
  },
}));

import OperatorService from '../../../StaffService/OperatorService';
import { useTripsTab } from '../useOperatorDashboard';

// Phase B (§4.13): a multi-leg schedule over a From..To range is previewed by the server, then confirmed.

const preview = {
  from_date: '2026-10-07', to_date: '2026-10-09', create_count: 2, skip_count: 1,
  days: [{ date: '2026-10-07', ok: true, reason: null }, { date: '2026-10-08', ok: false, reason: 'Busy.' }, { date: '2026-10-09', ok: true, reason: null }],
};

const fillRange = (result, overrides = {}) => act(() => result.current.setForm((p) => ({
  ...p, trip_type: 'round_trip', fleet_route_id: '4', driver_id: '7', conductor_id: '9', block_type: 'morning',
  trip_date: '2026-10-07', to_date: '2026-10-09', leg_departure_times: ['08:00', '11:00'], ...overrides,
})));

const submit = (result) => act(async () => { await result.current.handleSchedule({ preventDefault: () => {} }); });

beforeEach(() => {
  vi.clearAllMocks();
  OperatorService.getOperatorFleetRoutes.mockResolvedValue({ data: [] });
  OperatorService.getOperatorTrips.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } });
  OperatorService.previewShiftBlockRange.mockResolvedValue({ data: preview });
  OperatorService.createShiftBlockRange.mockResolvedValue({ data: { ...preview, days: preview.days }, message: '2 days scheduled, 1 skipped' });
});

describe('useTripsTab date range', () => {
  test('the form submit previews the range (nothing is created), then confirm creates it', async () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() => useTripsTab({ trips: [], onRefresh }));
    fillRange(result);

    await submit(result);
    expect(OperatorService.previewShiftBlockRange).toHaveBeenCalledWith({
      fleet_route_id: 4, driver_id: 7, conductor_id: 9, block_type: 'morning', from_date: '2026-10-07', to_date: '2026-10-09',
      service_type: 'regular', leg_departure_times: ['08:00', '11:00'],
    });
    expect(OperatorService.createShiftBlockRange).not.toHaveBeenCalled();
    expect(OperatorService.createShiftBlock).not.toHaveBeenCalled();
    expect(result.current.rangePreview).toEqual(preview);

    await act(async () => { await result.current.confirmRange(); });
    expect(OperatorService.createShiftBlockRange).toHaveBeenCalledTimes(1);
    expect(result.current.rangeResult.message).toBe('2 days scheduled, 1 skipped');
    expect(onRefresh).toHaveBeenCalled();
  });

  test('a double tap on confirm sends one request', async () => {
    let finish;
    OperatorService.createShiftBlockRange.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useTripsTab({ trips: [], onRefresh: () => {} }));
    fillRange(result);
    await submit(result);

    await act(async () => {
      const first = result.current.confirmRange();
      const second = result.current.confirmRange();
      finish({ data: preview, message: 'ok' });
      await Promise.all([first, second]);
    });
    expect(OperatorService.createShiftBlockRange).toHaveBeenCalledTimes(1);
  });

  test('shows the server\'s refusal and keeps nothing previewed', async () => {
    OperatorService.previewShiftBlockRange.mockRejectedValue(new Error('Choose at most 31 days.'));
    const { result } = renderHook(() => useTripsTab({ trips: [], onRefresh: () => {} }));
    fillRange(result, { to_date: '2026-11-30' });

    await submit(result);
    expect(result.current.msg).toBe('Choose at most 31 days.');
    expect(result.current.rangePreview).toBeNull();
    expect(result.current.saving).toBe(false);
  });

  test('a changed form drops the old preview, so confirm cannot use stale days', async () => {
    const { result } = renderHook(() => useTripsTab({ trips: [], onRefresh: () => {} }));
    fillRange(result);
    await submit(result);
    expect(result.current.rangePreview).not.toBeNull();

    act(() => result.current.setForm((p) => ({ ...p, to_date: '2026-10-10' })));
    expect(result.current.rangePreview).toBeNull();
  });

  test('a To date equal to From keeps the single-block path', async () => {
    OperatorService.createShiftBlock.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useTripsTab({ trips: [], onRefresh: () => {} }));
    fillRange(result, { to_date: '2026-10-07' });

    await submit(result);
    expect(OperatorService.previewShiftBlockRange).not.toHaveBeenCalled();
    expect(OperatorService.createShiftBlock).toHaveBeenCalledWith(expect.objectContaining({ scheduled_date: '2026-10-07' }));
  });
});
