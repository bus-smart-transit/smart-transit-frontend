import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../../../services/trackingService', () => ({ getTracking: vi.fn() }));
vi.mock('../../../Map/RouteMap', () => ({
  default: ({ routeId, direction, vehicle, highlight }) => (
    <div data-testid="map" data-route={routeId} data-direction={direction} data-vehicle={vehicle ? `${vehicle.latitude},${vehicle.longitude}` : ''} data-highlight={highlight ? `${highlight.fromStopId}-${highlight.toStopId}` : ''} />
  ),
}));

import { getTracking } from '../../../../services/trackingService';
import TrackBusPage from '../TrackBusPage';
import TicketCard from '../../Ticket/TicketCard';

const TOKEN = 'A'.repeat(43);

const view = (over = {}) => ({
  state: 'tracking',
  message: null,
  ticket: { status: 'valid', seat_type: 'seated' },
  trip: { trip_date: '2026-10-04', departure_time: '08:00', status: 'departed', route_name: 'Alpha - Beta' },
  route: { route_id: 7, direction: 'outbound' },
  boarding: { stop_id: 11, name: 'Stop B', eta_time: '08:15', eta: '2026-10-04T08:15:00+08:00', eta_source: 'live', progress: 'upcoming' },
  alighting: { stop_id: 12, name: 'Stop D', eta_time: '08:45', eta: '2026-10-04T08:45:00+08:00', eta_source: 'scheduled', progress: 'upcoming' },
  bus: { latitude: 7.1, longitude: 125.0, heading: 0, on_route: true, age_seconds: 4, recorded_at: '2026-10-04T08:00:00+08:00' },
  refresh: { poll_seconds: 10, generated_at: '2026-10-04T08:00:00+08:00', eta_basis: 'live' },
  ...over,
});

const renderPage = () => render(
  <MemoryRouter initialEntries={[`/track/${TOKEN}`]}>
    <Routes><Route path="/track/:token" element={<TrackBusPage />} /></Routes>
  </MemoryRouter>,
);

describe('TrackBusPage', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  test('shows the live bus on the route, the ETA at the ticket\'s own stops and nothing private', async () => {
    getTracking.mockResolvedValue(view());
    renderPage();

    expect(await screen.findByText('Live')).toBeInTheDocument();
    expect(getTracking).toHaveBeenCalledWith(TOKEN);
    expect(screen.getByText('Stop B')).toBeInTheDocument();
    expect(screen.getByText('08:15 (in 15 min)')).toBeInTheDocument(); // measured on the server's clock, not the phone's
    expect(screen.getByText('08:45 (in 45 min)')).toBeInTheDocument();
    expect(screen.getByText('Live estimate')).toBeInTheDocument();
    const map = screen.getByTestId('map');
    expect(map.dataset).toMatchObject({ route: '7', direction: 'outbound', vehicle: '7.1,125', highlight: '11-12' });
    expect(document.body.textContent).not.toMatch(/plate|driver|conductor|ticket_uuid/i);
    expect(document.head.querySelector('meta[name="referrer"]')?.content).toBe('no-referrer');
  });

  test('says so when the bus has not left, or tracking has not opened yet', async () => {
    getTracking.mockResolvedValue(view({ state: 'waiting', message: 'The bus has not left yet.', bus: null }));
    const { unmount } = renderPage();
    expect(await screen.findByText('The bus has not left yet.')).toBeInTheDocument();
    expect(screen.getByTestId('map').dataset.vehicle).toBe('');
    unmount();

    getTracking.mockResolvedValue(view({ state: 'not_yet', message: 'Tracking opens shortly before departure.', bus: null, opens_at: '2026-10-04T07:00:00+08:00' }));
    renderPage();
    expect(await screen.findByText('Tracking opens soon')).toBeInTheDocument();
    expect(screen.getByText(/Opens at 07:00 AM/i)).toBeInTheDocument();
  });

  test('labels an old position instead of showing it as live', async () => {
    getTracking.mockResolvedValue(view({ state: 'stale', bus: { ...view().bus, age_seconds: 300 } }));
    renderPage();

    expect(await screen.findByText('Last known position')).toBeInTheDocument();
    expect(screen.getByText('Last update 5 min ago.')).toBeInTheDocument();
  });

  test('an unknown link gets a friendly message and no further requests', async () => {
    getTracking.mockRejectedValue({ response: { status: 404 } });
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('This tracking link is not valid');
    expect(screen.queryByTestId('map')).not.toBeInTheDocument();
    expect(getTracking).toHaveBeenCalledTimes(1);
  });

  test('does not show a bad link as a crash when the connection fails', async () => {
    getTracking.mockRejectedValue(new Error('network'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not refresh/i);
  });
});

describe('TrackBusPage refresh', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers({ shouldAdvanceTime: true }); });
  afterEach(() => { vi.useRealTimers(); cleanup(); });

  test('refreshes at the server\'s interval, keeps the last view when a refresh fails, and stops when the trip is over', async () => {
    getTracking.mockResolvedValueOnce(view({ refresh: { poll_seconds: 10, generated_at: '2026-10-04T08:00:00+08:00' } }));
    renderPage();
    await screen.findByText('Live');
    expect(getTracking).toHaveBeenCalledTimes(1);

    getTracking.mockRejectedValueOnce(new Error('offline'));
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(getTracking).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Live')).toBeInTheDocument(); // still the last good view
    expect(screen.getByText(/could not refresh/i)).toBeInTheDocument();

    getTracking.mockResolvedValueOnce(view({ state: 'ended', message: 'This trip has ended, so tracking has closed.', bus: null }));
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(await screen.findByText('Tracking closed')).toBeInTheDocument();
    const calls = getTracking.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(getTracking.mock.calls.length).toBe(calls); // over: no more polling
  });
});

describe('TicketCard tracking link', () => {
  const card = (props) => render(
    <MemoryRouter>
      <TicketCard fromLabel="A" toLabel="B" statusLabel="Valid" {...props} />
    </MemoryRouter>,
  );
  afterEach(cleanup);

  test('offers Track this bus and a copyable link only for a usable ticket that has one', async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    card({ trackingToken: TOKEN });

    expect(screen.getByRole('link', { name: /track this bus/i })).toHaveAttribute('href', `/track/${TOKEN}`);
    fireEvent.click(screen.getByRole('button', { name: /copy tracking link/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/track/${TOKEN}`));
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
  });

  test.each([['Expired'], ['Cancelled'], ['Alighted']])('hides it for a %s ticket', (status) => {
    card({ trackingToken: TOKEN, statusLabel: status });
    expect(screen.queryByRole('link', { name: /track this bus/i })).not.toBeInTheDocument();
  });

  test('hides it when the ticket has no link', () => {
    card({ trackingToken: '' });
    expect(screen.queryByRole('link', { name: /track this bus/i })).not.toBeInTheDocument();
  });
});
