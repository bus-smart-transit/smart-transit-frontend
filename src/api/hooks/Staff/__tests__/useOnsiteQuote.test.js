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
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', amount: 35, originalAmount: null, discountAmount: null, discountLabel: null, message: '' }));
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

  it('includes an onsite discount only once the ID check is ticked, and shows the regular fare beside it', async () => {
    quoteOnsite.mockResolvedValueOnce({ data: { amount: 35 } })
      .mockResolvedValueOnce({ data: { amount: 28, original_amount: 35, discount_amount: 7, discount_label: 'Student' } });
    const { result, rerender } = renderHook(({ d }) => useOnsiteQuote({ tripId: 7, form, ready: true, discount: d }), {
      initialProps: { d: { discount_type_key: 'student', discount_id_checked: false } },
    });
    await waitFor(() => expect(result.current.amount).toBe(35));
    expect(quoteOnsite).toHaveBeenLastCalledWith({ trip_id: 7, seat_type: 'seated', origin_stop_id: 1, destination_stop_id: 3 });

    rerender({ d: { discount_type_key: 'student', discount_id_checked: true } });

    await waitFor(() => expect(result.current.amount).toBe(28));
    expect(result.current).toMatchObject({ originalAmount: 35, discountAmount: 7, discountLabel: 'Student' });
    expect(quoteOnsite).toHaveBeenLastCalledWith({ trip_id: 7, seat_type: 'seated', origin_stop_id: 1, destination_stop_id: 3, discount_type_key: 'student', discount_id_checked: true });
  });

  it('asks again when the Chauffeur picks a different check-in', async () => {
    quoteOnsite.mockResolvedValueOnce({ data: { amount: 40 } }).mockResolvedValueOnce({ data: { amount: 50 } });
    const checkin = { ...form, boarding_mode: 'checkin', origin_stop_id: '', pending_boarding_id: '4' };
    const { result, rerender } = renderHook(({ f }) => useOnsiteQuote({ tripId: 7, form: f, ready: true }), { initialProps: { f: checkin } });
    await waitFor(() => expect(result.current.amount).toBe(40));

    rerender({ f: { ...checkin, pending_boarding_id: '5' } });

    await waitFor(() => expect(result.current.amount).toBe(50));
    expect(quoteOnsite).toHaveBeenLastCalledWith({ trip_id: 7, seat_type: 'seated', pending_boarding_id: 5, destination_stop_id: 3 });
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