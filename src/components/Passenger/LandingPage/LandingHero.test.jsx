import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../../../services/bookingService', () => ({
  getBookingStops: vi.fn(async (origin) => ({
    meta: { today: '2026-10-01', max_advance_days: 30 },
    groups: [{ municipality: 'Alpha Town', provinces: ['North'], stops: origin
      ? [{ stop_id: 2, stop_code: 'beta-stop', name: 'Beta Stop', route_ids: [1] }]
      : [{ stop_id: 1, stop_code: 'alpha-stop', name: 'Alpha Stop', route_ids: [1] }, { stop_id: 2, stop_code: 'beta-stop', name: 'Beta Stop', route_ids: [1] }] }],
  })),
  readApiError: (e) => ({ message: e?.message || '', fieldErrors: {} }),
}));
vi.mock('../../../services/regionService', () => ({
  getRegion: vi.fn(async () => ({ name: 'Test Region', bounds: { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 }, center: null, provinces: {} })),
  regionMapBounds: () => [],
}));

import LandingHero from './LandingHero';
import { buildBookingQuery, findStopCode, parseBookingQuery, withBookingParams } from '../../../utils/bookingQuery';

describe('LandingHero (C1: no Available Trips list; search hands the journey to the booking page)', () => {
  beforeEach(() => vi.clearAllMocks());

  test('offers server-provided stops and the region name, and has no trip list', async () => {
    render(
      <MemoryRouter>
        <LandingHero />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('option', { name: 'Alpha Stop' })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/across Test Region/)).toBeInTheDocument());
    expect(screen.queryByText(/Available Trips/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^search$/i })).toBeDisabled();
  });
});



function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}{location.search}</p>;
}

describe('LandingHero search link (Batch 25, Issue 3)', () => {
  test('the search card is only From, To, Date and Search (no Book Now / Book Later)', async () => {
    render(<MemoryRouter><LandingHero /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('option', { name: 'Alpha Stop' })).toBeInTheDocument());
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.queryByText(/book now|book later/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/time/i)).not.toBeInTheDocument();
  });

  test('goes to the booking page with readable stop codes and the date, and no ids or mode', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LandingHero />} />
          <Route path="/passenger/book" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('option', { name: 'Alpha Stop' })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '1' } });
    await waitFor(() => expect(screen.getByLabelText('To')).not.toBeDisabled());
    await waitFor(() => expect(screen.getAllByRole('option', { name: 'Beta Stop' }).length).toBeGreaterThan(0));
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    const where = await screen.findByTestId('where');
    expect(where.textContent).toBe('/passenger/book?from=alpha-stop&to=beta-stop&date=2026-10-01');
    expect(where.textContent).not.toMatch(/_id|mode=/);
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
