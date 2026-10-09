import { describe, expect, test, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

vi.mock('../../../StaffService/OperatorService', () => ({
  default: {
    getRouteAdherence: vi.fn(),
    getOccupancyTrends: vi.fn(),
    getDailySummary: vi.fn(),
  },
}));

import OperatorService from '../../../StaffService/OperatorService';
import { useReportsTab } from '../useOperatorDashboard';

// The Fleet Reports period: the server already takes start_date and end_date (default: this month so far).

beforeEach(() => {
  vi.clearAllMocks();
  OperatorService.getRouteAdherence.mockResolvedValue({ data: [{ route_name: 'A' }] });
  OperatorService.getOccupancyTrends.mockResolvedValue({ data: [] });
  OperatorService.getDailySummary.mockResolvedValue({ data: [] });
});

describe('useReportsTab period', () => {
  test('asks for the server default (this month so far) when no dates are chosen', async () => {
    const { result } = renderHook(() => useReportsTab());
    act(() => result.current.setSelectedFleet('7'));

    await act(async () => { await result.current.fetchReport(); });

    expect(OperatorService.getRouteAdherence).toHaveBeenCalledWith('7', {});
    expect(result.current.ranRange).toEqual({ from: '', to: '' });
  });

  test('sends the chosen dates and remembers the period the report on screen was run for', async () => {
    const { result } = renderHook(() => useReportsTab());
    act(() => {
      result.current.setSelectedFleet('7');
      result.current.setReportType('occupancy');
      result.current.setStartDate('2026-10-01');
      result.current.setEndDate('2026-10-09');
    });

    await act(async () => { await result.current.fetchReport(); });
    expect(OperatorService.getOccupancyTrends).toHaveBeenCalledWith('7', { start_date: '2026-10-01', end_date: '2026-10-09' });
    expect(result.current.ranRange).toEqual({ from: '2026-10-01', to: '2026-10-09' });

    // Changing the pickers afterwards does not rename the report already on screen.
    act(() => result.current.setEndDate('2026-10-20'));
    expect(result.current.ranRange).toEqual({ from: '2026-10-01', to: '2026-10-09' });
  });

  test('sends only the date that was chosen', async () => {
    const { result } = renderHook(() => useReportsTab());
    act(() => {
      result.current.setSelectedFleet('7');
      result.current.setReportType('daily');
      result.current.setStartDate('2026-10-05');
    });

    await act(async () => { await result.current.fetchReport(); });

    expect(OperatorService.getDailySummary).toHaveBeenCalledWith('7', { start_date: '2026-10-05' });
  });

  test('refuses an end date before the start date without asking the server', async () => {
    const { result } = renderHook(() => useReportsTab());
    act(() => {
      result.current.setSelectedFleet('7');
      result.current.setStartDate('2026-10-09');
      result.current.setEndDate('2026-10-01');
    });

    await act(async () => { await result.current.fetchReport(); });

    expect(result.current.msg).toBe('The end date cannot be before the start date.');
    expect(OperatorService.getRouteAdherence).not.toHaveBeenCalled();
  });

  test('still needs a fleet', async () => {
    const { result } = renderHook(() => useReportsTab());

    await act(async () => { await result.current.fetchReport(); });

    expect(result.current.msg).toBe('Please select a fleet first.');
    expect(OperatorService.getRouteAdherence).not.toHaveBeenCalled();
  });
});
