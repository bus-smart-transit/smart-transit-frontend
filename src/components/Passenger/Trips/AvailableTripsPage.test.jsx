import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const STOPS = [
  { stop_id: 1, stop_code: 'alpha-stop', name: 'Alpha Stop', route_ids: [1] },
  { stop_id: 2, stop_code: 'beta-stop', name: 'Beta Stop', route_ids: [1] },
  { stop_id: 3, stop_code: 'gamma-stop', name: 'Gamma Stop', route_ids: [1] },
];

vi.mock('../../../services/bookingService', () => ({
  getBookingStops: vi.fn(async (origin) => ({
    meta: { today: '2026-10-01', max_advance_days: 30, home_preview_limit: 5, trips_per_page: 2 },
    groups: [{ municipality: 'Alpha Town', provinces: ['North'], stops: origin ? STOPS.filter((s) => String(s.stop_id) !== String(origin)) : STOPS }],
  })),
  getTrips: vi.fn(),
  readApiError: (error, fallback) => ({ message: error?.response?.data?.errors?.from?.[0] || error?.message || fallback, fieldErrors: {} }),
}));

import { getTrips } from '../../../services/bookingService';
import AvailableTripsPage from './AvailableTripsPage';

const alpha = { stop_id: 1, stop_code: 'alpha-stop', name: 'Alpha Stop' };
const beta = { stop_id: 2, stop_code: 'beta-stop', name: 'Beta Stop' };
const trip = (id, date, time) => ({
  trip_id: id, trip_date: date, boarding_time: time, arrival_time: '09:00', duration_minutes: 30, plate_number: `PLATE-${id}`, seats_left: 12, fare: 58,
  origin: alpha, destination: beta,
});
const answer = (over = {}) => ({
  date: '2026-10-01', trips: [trip(1, '2026-10-01', '06:15'), trip(2, '2026-10-01', '08:15')], page: 1, per_page: 2, total: 3, last_page: 2,
  next_available_date: null, message: null, from: alpha, to: beta, ...over,
});

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}{location.search}</p>;
}

function Current() {
  const location = useLocation();
  return <p data-testid="current">{location.search}</p>;
}

const renderAt = (url) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes>
      <Route path="/passenger/trips" element={<><AvailableTripsPage /><Current /></>} />
      <Route path="/passenger/book" element={<Where />} />
      <Route path="/passenger" element={<p>Search home</p>} />
    </Routes>
  </MemoryRouter>,
);

describe('AvailableTripsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  test('lists one page of the journey from the address, using the server page size, with a count and pages', async () => {
    getTrips.mockResolvedValue(answer());
    renderAt('/passenger/trips?from=alpha-stop&to=beta-stop&date=2026-10-01');

    expect(await screen.findByText('3 trips found')).toBeInTheDocument();
    expect(getTrips).toHaveBeenCalledWith({ seat_type: 'seated', page: 1, from: 'alpha-stop', to: 'beta-stop', date: '2026-10-01', per_page: 2 });
    expect(screen.getByRole('heading', { name: /Alpha Stop.*Beta Stop/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Book Seat' })).toHaveLength(2);
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  test('the controls reflect the address, and Next asks the server for the next page', async () => {
    getTrips.mockResolvedValue(answer());
    renderAt('/passenger/trips?from=alpha-stop&to=beta-stop&date=2026-10-01');

    await waitFor(() => expect(screen.getByLabelText('From')).toHaveValue('Alpha Stop'));
    await waitFor(() => expect(screen.getByLabelText('To')).toHaveValue('Beta Stop'));
    expect(screen.getByLabelText('Date')).toHaveValue('2026-10-01');

    getTrips.mockResolvedValue(answer({ page: 2, trips: [trip(3, '2026-10-01', '10:15')] }));
    fireEvent.click(await screen.findByRole('button', { name: /next/i }));

    await waitFor(() => expect(getTrips).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    expect(screen.getByTestId('current').textContent).toContain('page=2');
  });

  test('editing the date updates the address and asks for that day, back on page one', async () => {
    getTrips.mockResolvedValue(answer());
    renderAt('/passenger/trips?from=alpha-stop&to=beta-stop&date=2026-10-01&page=2');
    await screen.findByText('3 trips found');

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-05' } });

    await waitFor(() => expect(getTrips).toHaveBeenLastCalledWith(expect.objectContaining({ date: '2026-10-05', page: 1 })));
    expect(screen.getByTestId('current').textContent).toBe('?from=alpha-stop&to=beta-stop&date=2026-10-05');
  });

  test('changing From clears To in the address and asks again', async () => {
    getTrips.mockResolvedValue(answer());
    renderAt('/passenger/trips?from=alpha-stop&to=beta-stop&date=2026-10-01');
    await waitFor(() => expect(screen.getByLabelText('From')).toHaveValue('Alpha Stop'));

    const from = screen.getByLabelText('From');
    fireEvent.focus(from);
    fireEvent.click(await screen.findByRole('option', { name: 'Gamma Stop' }));

    await waitFor(() => expect(screen.getByTestId('current').textContent).toBe('?from=gamma-stop&date=2026-10-01'));
  });

  test('Book Seat opens the booking page with the trip\'s own stop codes, date and time', async () => {
    getTrips.mockResolvedValue(answer({ trips: [trip(1, '2026-10-01', '06:15'), trip(3, '2026-10-02', '07:45')] }));
    renderAt('/passenger/trips?from=alpha-stop&to=beta-stop&date=2026-10-01');

    const buttons = await screen.findAllByRole('button', { name: 'Book Seat' });
    fireEvent.click(buttons[1]);

    expect((await screen.findByTestId('where')).textContent).toBe('/passenger/book?from=alpha-stop&to=beta-stop&date=2026-10-02&time=07%3A45');
  });

  test('an empty day offers the next available date from the server, one tap away', async () => {
    getTrips.mockResolvedValue(answer({ trips: [], total: 0, last_page: 1, next_available_date: '2026-10-09', message: 'No departures match your journey on that date.' }));
    renderAt('/passenger/trips?from=alpha-stop&to=beta-stop&date=2026-10-05');

    expect(await screen.findByText(/No trips on this date\. Next available:/)).toBeInTheDocument();
    expect(screen.getByText('Fri, Oct 9, 2026')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Book Seat' })).not.toBeInTheDocument();

    getTrips.mockResolvedValue(answer());
    fireEvent.click(screen.getByRole('button', { name: 'Show that day' }));
    await waitFor(() => expect(getTrips).toHaveBeenLastCalledWith(expect.objectContaining({ date: '2026-10-09' })));
  });

  test('an empty day with nothing ahead says so', async () => {
    getTrips.mockResolvedValue(answer({ trips: [], total: 0, last_page: 1, next_available_date: null }));
    renderAt('/passenger/trips?from=alpha-stop&to=beta-stop&date=2026-10-05');

    expect(await screen.findByText(/none further ahead/)).toBeInTheDocument();
  });

  test('a bad stop or date shows the server\'s friendly message and a way to clear the search', async () => {
    getTrips.mockRejectedValue({ response: { data: { errors: { from: ['We could not find the stop in this link. It may be out of date. Choose your stops again.'] } } } });
    renderAt('/passenger/trips?from=nope&to=beta-stop');

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not find the stop/);
    expect(screen.getByRole('link', { name: 'Clear search' })).toBeInTheDocument();
  });

  test('with nothing in the address it lists today\'s trips for every route', async () => {
    getTrips.mockResolvedValue(answer({ from: null, to: null }));
    renderAt('/passenger/trips');

    expect(await screen.findByRole('heading', { name: 'All routes' })).toBeInTheDocument();
    await waitFor(() => expect(getTrips).toHaveBeenCalledWith({ seat_type: 'seated', page: 1, per_page: 2 })); // no date: the server uses today in Manila
  });
});
