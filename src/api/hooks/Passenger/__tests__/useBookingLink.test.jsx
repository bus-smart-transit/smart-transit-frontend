import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../../services/bookingService', () => ({
  getBookingLink: vi.fn(),
  readApiError: (error, fallback) => ({ message: error?.response?.data?.errors?.from?.[0] || error?.message || fallback, fieldErrors: {} }),
}));

import { getBookingLink } from '../../../../services/bookingService';
import useBookingLink from '../useBookingLink';

const link = (date) => ({
  from: { stop_id: 4, stop_code: 'daliao', name: 'Daliao' },
  to: { stop_id: 5, stop_code: 'toril', name: 'Toril' },
  date,
});

describe('useBookingLink', () => {
  beforeEach(() => vi.clearAllMocks());

  test('no booking params: nothing is checked', () => {
    const { result } = renderHook(() => useBookingLink(new URLSearchParams('tab=book')));
    expect(result.current.status).toBe('none');
    expect(getBookingLink).not.toHaveBeenCalled();
  });

  test('the link sets the stops and the day; the mode is page state, never read from the URL', async () => {
    getBookingLink.mockResolvedValue(link('2026-10-01'));
    const { result } = renderHook(() => useBookingLink(new URLSearchParams('from=daliao&to=toril&date=2026-10-01&mode=later')));

    await waitFor(() => expect(result.current.status).toBe('ok'));
    expect(getBookingLink).toHaveBeenCalledWith({ from: 'daliao', to: 'toril', date: '2026-10-01' });
    expect(result.current.journey).toMatchObject({ origin_stop_id: '4', destination_stop_id: '5', booking_option: 'now', booking_date: '2026-10-01' });
  });

  test('a future date is kept as the booking date (the page then offers Book Later only)', async () => {
    getBookingLink.mockResolvedValue(link('2026-10-05'));
    const { result } = renderHook(() => useBookingLink(new URLSearchParams('from=daliao&to=toril&date=2026-10-05')));

    await waitFor(() => expect(result.current.status).toBe('ok'));
    expect(result.current.journey).toMatchObject({ booking_option: 'now', booking_date: '2026-10-05' });
  });

  test('a trip picked from the results (?time=) opens Book Later with that departure', async () => {
    getBookingLink.mockResolvedValue(link('2026-10-01'));
    const { result } = renderHook(() => useBookingLink(new URLSearchParams('from=daliao&to=toril&date=2026-10-01&time=08:30')));

    await waitFor(() => expect(result.current.status).toBe('ok'));
    expect(result.current.journey).toMatchObject({ booking_option: 'later', booking_time: '08:30', booking_date: '2026-10-01' });
    expect(result.current.link.from.name).toBe('Daliao');
  });

  test('a rejected link becomes a friendly message, not a crash', async () => {
    getBookingLink.mockRejectedValue({ response: { data: { errors: { from: ['We could not find the stop in this link. It may be out of date. Choose your stops again.'] } } } });
    const { result } = renderHook(() => useBookingLink(new URLSearchParams('from=nope&to=toril')));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.message).toMatch(/could not find the stop/);
    expect(result.current.journey).toBeNull();
  });

  test('an old id-based link is refused without calling the server', () => {
    const { result } = renderHook(() => useBookingLink(new URLSearchParams('origin_stop_id=4&destination_stop_id=5&mode=now')));
    expect(result.current.status).toBe('error');
    expect(result.current.message).toMatch(/out of date/);
    expect(getBookingLink).not.toHaveBeenCalled();
  });
});
