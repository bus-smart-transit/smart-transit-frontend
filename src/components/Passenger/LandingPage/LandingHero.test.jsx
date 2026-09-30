import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../services/bookingService', () => ({
  getBookingStops: vi.fn(async (origin) => ({
    groups: [{ municipality: 'Alpha Town', provinces: ['North'], stops: origin
      ? [{ stop_id: 2, name: 'Beta Stop', route_ids: [1] }]
      : [{ stop_id: 1, name: 'Alpha Stop', route_ids: [1] }, { stop_id: 2, name: 'Beta Stop', route_ids: [1] }] }],
  })),
  readApiError: (e) => ({ message: e?.message || '', fieldErrors: {} }),
}));
vi.mock('../../../services/regionService', () => ({
  getRegion: vi.fn(async () => ({ name: 'Test Region', bounds: { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 }, center: null, provinces: {} })),
  regionMapBounds: () => [],
}));

import LandingHero from './LandingHero';
import { buildBookingQuery } from '../../../utils/bookingQuery';

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
    expect(screen.getByRole('button', { name: /find my bus/i })).toBeDisabled();
  });
});

describe('buildBookingQuery', () => {
  test('Book Now carries only the stops and mode', () => {
    expect(buildBookingQuery({ origin_stop_id: '1', destination_stop_id: '2', booking_option: 'now', booking_date: '2030-01-01', booking_time: '08:00' }))
      .toBe('origin_stop_id=1&destination_stop_id=2&mode=now');
  });

  test('Book Later carries the chosen date and time', () => {
    expect(buildBookingQuery({ origin_stop_id: '1', destination_stop_id: '2', booking_option: 'later', booking_date: '2030-01-01', booking_time: '08:00' }))
      .toBe('origin_stop_id=1&destination_stop_id=2&mode=later&date=2030-01-01&time=08%3A00');
  });
});
