import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useOnsiteQuote from '../useOnsiteQuote';

const quoteOnsite = vi.hoisted(() => vi.fn());
vi.mock('../../../StaffService/ConductorService', () => ({ default: { quoteOnsite } }));

const form = { boarding_mode: 'stop', origin_stop_id: '1', destination_stop_id: '3', seat_type: 'seated' };

describe('useOnsiteQuote', () => {
  beforeEach(() => { quoteOnsite.mockReset(); });

  it('asks nothing until the boarding point and destination are chosen', () => {
    const { result } = renderHook(() => useOnsiteQuote({ tripId: 7, form, ready: false }));

    expect(result.current).toEqual({ status: 'idle', amount: null, message: '' });
    expect(quoteOnsite).not.toHaveBeenCalled();
  });

  it('asks the server for the sale as it would be made, then shows the exact fare', async () => {
    quoteOnsite.mockResolvedValue({ data: { amount: 35 } });
    const { result } = renderHook(() => useOnsiteQuote({ tripId: 7, form, ready: true }));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', amount: 35, message: '' }));
    expect(quoteOnsite).toHaveBeenCalledWith({ trip_id: 7, seat_type: 'seated', origin_stop_id: 1, destination_stop_id: 3 });
  });

  it('asks again when the destination or the seat type changes, and never shows the old fare for the new choice', async () => {
    quoteOnsite.mockResolvedValueOnce({ data: { amount: 35 } }).mockResolvedValueOnce({ data: { amount: 25 } });
    const { result, rerender } = renderHook(({ f }) => useOnsiteQuote({ tripId: 7, form: f, ready: true }), { initialProps: { f: form } });
    await waitFor(() => expect(result.current.amount).toBe(35));

    rerender({ f: { ...form, destination_stop_id: '2' } });

    expect(result.current.status).toBe('loading');
    expect(result.current.amount).toBeNull();
    await waitFor(() => expect(result.current.amount).toBe(25));
    expect(quoteOnsite).toHaveBeenCalledTimes(2);
  });

  it('shows the reason when the fare cannot be worked out, so the sale is not offered blind', async () => {
    quoteOnsite.mockRejectedValue(new Error('The destination must be ahead of your boarding point for this trip\'s direction.'));
    const { result } = renderHook(() => useOnsiteQuote({ tripId: 7, form, ready: true }));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.message).toContain('destination must be ahead');
    expect(result.current.amount).toBeNull();
  });

  it('asks again for the same form when the bus position is refreshed', async () => {
    quoteOnsite.mockResolvedValueOnce({ data: { amount: 30 } }).mockResolvedValueOnce({ data: { amount: 32 } });
    const gps = { ...form, boarding_mode: 'gps', origin_stop_id: '' };
    const { result, rerender } = renderHook(({ k }) => useOnsiteQuote({ tripId: 7, form: gps, ready: true, refreshKey: k }), { initialProps: { k: 10.2 } });
    await waitFor(() => expect(result.current.amount).toBe(30));

    rerender({ k: 11.5 });

    await waitFor(() => expect(result.current.amount).toBe(32));
    expect(quoteOnsite).toHaveBeenLastCalledWith({ trip_id: 7, seat_type: 'seated', boarding_mode: 'gps', destination_stop_id: 3 });
  });
});