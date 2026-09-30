import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const STOPS = [
  { stop_id: 1, stop_code: 'alpha-stop', name: 'Alpha Stop', route_ids: [1] },
  { stop_id: 2, stop_code: 'beta-stop', name: 'Beta Stop', route_ids: [1] },
  { stop_id: 3, stop_code: 'gamma-stop', name: 'Gamma Stop', route_ids: [1] },
];

vi.mock('../../../services/bookingService', () => ({
  getBookingStops: vi.fn(async (origin) => ({
    meta: { today: '2026-10-01', max_advance_days: 30 },
    groups: [{ municipality: 'Alpha Town', provinces: ['North'], stops: origin ? STOPS.filter((s) => String(s.stop_id) !== String(origin)) : STOPS }],
  })),
  getTrips: vi.fn(async () => ({
    date: '2026-10-01',
    total: 7,
    message: null,
    trips: [1, 2, 3, 4, 5].map((n) => ({
      trip_id: n, trip_date: n === 5 ? '2026-10-02' : '2026-10-01', boarding_time: `0${n + 5}:15`, arrival_time: `0${n + 5}:45`,
      duration_minutes: 30, plate_number: `PLATE-${n}`, seats_left: 10 + n, fare: 58, leg_direction: 'outbound',
    })),
  })),
  readApiError: (e) => ({ message: e?.message || '', fieldErrors: {} }),
}));
vi.mock('../../../services/regionService', () => ({
  getRegion: vi.fn(async () => ({ name: 'Test Region', bounds: { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 }, center: null, provinces: {} })),
  regionMapBounds: () => [],
}));

import { getTrips } from '../../../services/bookingService';
import LandingHero from './LandingHero';
import { buildBookingQuery, findStopCode, parseBookingQuery, withBookingParams } from '../../../utils/bookingQuery';

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}{location.search}</p>;
}

const renderHero = () => render(
  <MemoryRouter initialEntries={['/']}>
    <Routes>
      <Route path="/" element={<LandingHero />} />
      <Route path="/passenger/book" element={<Where />} />
      <Route path="/passenger/trips" element={<Where />} />
    </Routes>
  </MemoryRouter>,
);

// Type-ahead picker: focus it, then pick an option from the list.
async function pick(label, optionName) {
  const input = screen.getByLabelText(label);
  fireEvent.focus(input);
  fireEvent.click(await screen.findByRole('option', { name: optionName }));
}

describe('LandingHero search card', () => {
  beforeEach(() => vi.clearAllMocks());

  test('offers server-provided stops and the region name, with Search disabled until a journey is chosen', async () => {
    renderHero();

    await waitFor(() => expect(screen.getByText(/across Test Region/)).toBeInTheDocument());
    fireEvent.focus(screen.getByLabelText('From'));
    expect(await screen.findByRole('option', { name: 'Alpha Stop' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^search$/i })).toBeDisabled();
    expect(screen.queryByText(/available trips/i)).not.toBeInTheDocument();
  });

  test('is only From, To, Date and Search (no Book Now / Book Later)', async () => {
    renderHero();
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
    expect(await screen.findByLabelText('Date')).toBeInTheDocument();
    expect(screen.queryByText(/book now|book later/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/time/i)).not.toBeInTheDocument();
  });

  test('From narrows as you type, by stop name', async () => {
    renderHero();
    const from = screen.getByLabelText('From');
    fireEvent.focus(from);
    await screen.findByRole('option', { name: 'Alpha Stop' });
    fireEvent.change(from, { target: { value: 'gam' } });

    expect(screen.getByRole('option', { name: 'Gamma Stop' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Alpha Stop' })).not.toBeInTheDocument();
  });

  test('keyboard: arrows move and Enter picks', async () => {
    renderHero();
    const from = screen.getByLabelText('From');
    fireEvent.focus(from);
    await screen.findByRole('option', { name: 'Alpha Stop' });
    fireEvent.keyDown(from, { key: 'ArrowDown' });
    fireEvent.keyDown(from, { key: 'Enter' });

    await waitFor(() => expect(from).toHaveValue('Beta Stop'));
  });

  test('Search shows up to five trips with times, seats and fare, and a Show all button', async () => {
    renderHero();
    await pick('From', 'Alpha Stop');
    await waitFor(() => expect(screen.getByLabelText('To')).not.toBeDisabled());
    await pick('To', 'Beta Stop');
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    expect(await screen.findByText('PLATE-1')).toBeInTheDocument();
    expect(getTrips).toHaveBeenCalledWith({ origin_stop_id: '1', destination_stop_id: '2', date: '2026-10-01', seat_type: 'seated', limit: 5 });
    expect(screen.getAllByRole('button', { name: 'Book Seat' })).toHaveLength(5);
    expect(screen.getAllByText('PHP 58.00')).toHaveLength(5);
    expect(screen.getByText(/11 seated seats available/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show all available trips \(7\)/i })).toBeInTheDocument();
  });

  test('Book Seat opens the booking page for that trip: stop codes, its date and time, never ids or a mode', async () => {
    renderHero();
    await pick('From', 'Alpha Stop');
    await waitFor(() => expect(screen.getByLabelText('To')).not.toBeDisabled());
    await pick('To', 'Beta Stop');
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));
    await screen.findByText('PLATE-2');

    fireEvent.click(within(screen.getByText('PLATE-2').closest('div[class*="p-5"]')).getByRole('button', { name: 'Book Seat' }));

    const where = await screen.findByTestId('where');
    expect(where.textContent).toBe('/passenger/book?from=alpha-stop&to=beta-stop&date=2026-10-01&time=07%3A15');
    expect(where.textContent).not.toMatch(/_id|mode=/);
  });

  test('Show all available trips opens the all-trips page for the same search', async () => {
    renderHero();
    await pick('From', 'Alpha Stop');
    await waitFor(() => expect(screen.getByLabelText('To')).not.toBeDisabled());
    await pick('To', 'Beta Stop');
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /show all available trips/i }));

    expect((await screen.findByTestId('where')).textContent).toBe('/passenger/trips?from=alpha-stop&to=beta-stop&date=2026-10-01');
  });
});
describe('booking link helpers', () => {
  test('buildBookingQuery writes codes and a date only when given', () => {
    expect(buildBookingQuery({ from: 'a-b', to: 'c', date: '2030-01-01', time: '08:00' })).toBe('from=a-b&to=c&date=2030-01-01&time=08%3A00');
    expect(buildBookingQuery({ from: 'a-b', to: 'c', time: '08:00' })).toBe('from=a-b&to=c');
    expect(buildBookingQuery({})).toBe('');
  });

  test('parseBookingQuery flags malformed values and old id-based links without trusting them', () => {
    const parse = (qs) => parseBookingQuery(new URLSearchParams(qs));
    expect(parse('from=Alpha-Stop&to=beta&date=2030-01-01&time=08:00')).toMatchObject({ from: 'alpha-stop', to: 'beta', date: '2030-01-01', time: '08:00', legacy: false, present: true });
    expect(parse('from=<script>&to=a b&date=tomorrow')).toMatchObject({ from: '!', to: '!', date: '!' });
    expect(parse('origin_stop_id=4&destination_stop_id=5&mode=now')).toMatchObject({ legacy: true, present: true, from: '' });
    expect(parse('')).toMatchObject({ present: false });
  });

  test('withBookingParams swaps the booking keys and keeps other params', () => {
    const next = withBookingParams(new URLSearchParams('tab=book&from=old&date=2030-01-01'), { from: 'a', to: 'b' });
    expect(next.toString()).toBe('tab=book&from=a&to=b');
  });

  test('findStopCode reads the code from the server stop groups', () => {
    const groups = [{ stops: [{ stop_id: 7, stop_code: 'seven' }, { stop_id: 8 }] }];
    expect(findStopCode(groups, '7')).toBe('seven');
    expect(findStopCode(groups, 8)).toBe('');
    expect(findStopCode(groups, 99)).toBe('');
  });
});
