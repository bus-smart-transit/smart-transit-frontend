import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../../../services/bookingService', () => ({
  getBookingLink: vi.fn(),
  getTrips: vi.fn(),
  readApiError: (error, fallback) => ({ message: error?.response?.data?.errors?.from?.[0] || error?.message || fallback, fieldErrors: {} }),
}));

import { getBookingLink, getTrips } from '../../../services/bookingService';
import AvailableTripsPage from './AvailableTripsPage';

const link = {
  from: { stop_id: 1, stop_code: 'alpha-stop', name: 'Alpha Stop' },
  to: { stop_id: 2, stop_code: 'beta-stop', name: 'Beta Stop' },
  date: '2026-10-01',
};
const trip = (id, date, time) => ({ trip_id: id, trip_date: date, boarding_time: time, arrival_time: '09:00', duration_minutes: 30, plate_number: `PLATE-${id}`, seats_left: 12, fare: 58 });

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}{location.search}</p>;
}

const renderAt = (url) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes>
      <Route path="/passenger/trips" element={<AvailableTripsPage />} />
      <Route path="/passenger/book" element={<Where />} />
      <Route path="/passenger" element={<p>Search home</p>} />
    </Routes>
  </MemoryRouter>,
);

describe('AvailableTripsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  test('lists every trip for the journey, grouped by day, with a count', async () => {
    getBookingLink.mockResolvedValue(link);
    getTrips.mockResolvedValue({ date: '2026-10-01', total: 3, message: null, trips: [trip(1, '2026-10-01', '06:15'), trip(2, '2026-10-01', '08:15'), trip(3, '2026-10-02', '06:15')] });
    renderAt('/passenger/trips?from=alpha-stop&to=beta-stop&date=2026-10-01');

    expect(await screen.findByText('3 trips found')).toBeInTheDocument();
    expect(getTrips).toHaveBeenCalledWith({ origin_stop_id: '1', destination_stop_id: '2', date: '2026-10-01', seat_type: 'seated' }); // no limit: all
    expect(screen.getByRole('heading', { name: /Alpha Stop.*Beta Stop/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Oct 1, 2026/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Oct 2, 2026/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Book Seat' })).toHaveLength(3);
  });

  test('Book Seat opens the booking page for that trip with codes, its own date and time', async () => {
    getBookingLink.mockResolvedValue(link);
    getTrips.mockResolvedValue({ date: '2026-10-01', total: 2, message: null, trips: [trip(1, '2026-10-01', '06:15'), trip(3, '2026-10-02', '07:45')] });
    renderAt('/passenger/trips?from=alpha-stop&to=beta-stop&date=2026-10-01');

    const buttons = await screen.findAllByRole('button', { name: 'Book Seat' });
    fireEvent.click(buttons[1]);

    expect((await screen.findByTestId('where')).textContent).toBe('/passenger/book?from=alpha-stop&to=beta-stop&date=2026-10-02&time=07%3A45');
  });

  test('a bad link shows a friendly message and a way back, and lists nothing', async () => {
    getBookingLink.mockRejectedValue({ response: { data: { errors: { from: ['We could not find the stop in this link. It may be out of date. Choose your stops again.'] } } } });
    renderAt('/passenger/trips?from=nope&to=beta-stop');

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not find the stop/);
    expect(screen.getByRole('link', { name: 'Search for a trip' })).toBeInTheDocument();
    expect(getTrips).not.toHaveBeenCalled();
  });

  test('no trips: says so instead of showing an empty page', async () => {
    getBookingLink.mockResolvedValue(link);
    getTrips.mockResolvedValue({ date: '2026-10-01', total: 0, message: 'No departures match your journey in the next days.', trips: [] });
    renderAt('/passenger/trips?from=alpha-stop&to=beta-stop&date=2026-10-01');

    await waitFor(() => expect(screen.getByText(/No departures match your journey/)).toBeInTheDocument());
    expect(screen.getByText('0 trips found')).toBeInTheDocument();
  });
});
