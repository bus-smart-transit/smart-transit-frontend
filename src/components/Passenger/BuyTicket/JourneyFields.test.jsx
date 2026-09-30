import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../services/bookingService', () => ({
  getBookingStops: vi.fn(),
  getDepartures: vi.fn(),
  resolveTrip: vi.fn(),
  readApiError: (error, fallback) => ({ message: error?.response?.data?.errors?.date?.[0] || error?.message || fallback, fieldErrors: {} }),
}));

import { getBookingStops, getDepartures } from '../../../services/bookingService';
import { useBookingStops, useDepartures } from '../../../api/hooks/Passenger/useBookingSearch';
import JourneyFields from './JourneyFields';

describe('JourneyFields (From, To, Date)', () => {
  const groups = [{ municipality: 'Alpha Town', provinces: [], stops: [{ stop_id: 1, name: 'Alpha Stop' }, { stop_id: 2, name: 'Beta Stop' }] }];
  const value = { origin_stop_id: '1', destination_stop_id: '', booking_date: '2026-10-01' };

  test('has no Book Now / Book Later; the date is limited to today .. today + window from the server', () => {
    render(<JourneyFields value={value} originGroups={groups} destinationGroups={groups} today="2026-10-01" maxAdvanceDays={30} onChange={() => {}} idPrefix="t" />);

    expect(screen.queryByText(/book now|book later/i)).not.toBeInTheDocument();
    const date = screen.getByLabelText('Date');
    expect(date).toHaveAttribute('min', '2026-10-01');
    expect(date).toHaveAttribute('max', '2026-10-31');
  });

  test('the date control waits for the server date, and reports changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(<JourneyFields value={value} originGroups={groups} destinationGroups={groups} today="" onChange={onChange} idPrefix="t" />);
    expect(screen.getByLabelText('Date')).toBeDisabled();

    rerender(<JourneyFields value={value} originGroups={groups} destinationGroups={groups} today="2026-10-01" maxAdvanceDays={30} onChange={onChange} idPrefix="t" />);
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-05' } });
    expect(onChange).toHaveBeenCalledWith('booking_date', '2026-10-05');
  });
});

describe('booking stops meta and departures hooks', () => {
  beforeEach(() => vi.clearAllMocks());

  test('today and the booking window come from the server', async () => {
    getBookingStops.mockResolvedValue({ groups: [], meta: { today: '2026-10-01', max_advance_days: 30 } });
    const { result } = renderHook(() => useBookingStops(''));

    await waitFor(() => expect(result.current.today).toBe('2026-10-01'));
    expect(result.current.maxAdvanceDays).toBe(30);
  });

  test('departures are requested only for Book Later with a journey and a date', async () => {
    getDepartures.mockResolvedValue({ departures: [{ trip_id: 9, boarding_time: '06:15', seats_left: 12 }], message: null });
    const args = { originStopId: '1', destinationStopId: '2', date: '2026-10-05', seatType: 'seated' };

    const idle = renderHook(() => useDepartures({ ...args, enabled: false }));
    expect(idle.result.current.ready).toBe(false);
    expect(getDepartures).not.toHaveBeenCalled();

    const { result } = renderHook(() => useDepartures({ ...args, enabled: true }));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.departures).toHaveLength(1));
    expect(getDepartures).toHaveBeenCalledWith({ origin_stop_id: '1', destination_stop_id: '2', date: '2026-10-05', seat_type: 'seated' });
    expect(result.current.loading).toBe(false);
  });

  test('a rejected date becomes a message, not a crash', async () => {
    getDepartures.mockRejectedValue({ response: { data: { errors: { date: ['That date has already passed (Manila time).'] } } } });
    const { result } = renderHook(() => useDepartures({ enabled: true, originStopId: '1', destinationStopId: '2', date: '2020-01-01', seatType: 'seated' }));

    await waitFor(() => expect(result.current.error).toMatch(/already passed/));
    expect(result.current.departures).toEqual([]);
  });
});
