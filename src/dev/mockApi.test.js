import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mockAdapter } from './mockApi';

// 2026-11-18: the preview mock answers the whole passenger booking flow (search -> book -> pay -> ticket).
const get = async (url, params) => (await mockAdapter({ method: 'get', url, params })).data;
const post = async (url, body) => (await mockAdapter({ method: 'post', url, data: JSON.stringify(body) })).data;

const memory = new Map();
beforeEach(() => {
  memory.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k) => (memory.has(k) ? memory.get(k) : null),
    setItem: (k, v) => memory.set(k, String(v)),
    removeItem: (k) => memory.delete(k),
  });
});

describe('preview mock: passenger booking', () => {
  it('signs the passenger portal in as a passenger and the rest as the Operator', async () => {
    expect((await post('/auth/login', { email: 'a@b.c', password: 'x', portal: 'passenger' })).data.user.role).toBe('passenger');
    expect((await post('/auth/login', { email: 'a@b.c', password: 'x', portal: 'operator' })).data.user.role).toBe('operator');
    expect((await get('/passengers/profile')).data.reward_points).toBe(20);
  });

  it('goes from a search to a paid ticket with a QR', async () => {
    const stops = (await get('/booking/stops')).data;
    expect(stops.groups.length).toBeGreaterThan(0);
    const destinations = (await get('/booking/stops', { origin_stop_id: 1 })).data.groups.flatMap((g) => g.stops);
    expect(destinations.map((s) => s.stop_code)).toContain('digos-terminal');

    // Tomorrow, so every hour is still ahead whatever the time is now.
    const window = (await get('/booking/window')).data;
    const date = new Date(`${window.today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    const tomorrow = date.toISOString().slice(0, 10);

    const link = (await get('/booking/link', { from: 'ecoland-terminal', to: 'digos-terminal', date: tomorrow })).data;
    expect(link).toMatchObject({ from: { stop_id: 1 }, to: { stop_id: 3 }, date: tomorrow });

    const trips = (await get('/booking/trips', { from: 'ecoland-terminal', to: 'digos-terminal', date: tomorrow, per_page: 6 })).data;
    expect(trips.total).toBe(17);
    expect(trips.trips[0]).toMatchObject({ boarding_time: '05:00', origin: { stop_id: 1 }, destination: { stop_id: 3 } });

    const departures = (await get('/booking/departures', { origin_stop_id: 1, destination_stop_id: 3, date: tomorrow })).data.departures;
    const trip = departures[0];
    const timeline = (await get(`/trips/${trip.trip_id}/timeline`, { boarding_stop_id: '1', alighting_stop_id: '3' })).data;
    expect(timeline.journey).toEqual({ boarding_stop_id: 1, alighting_stop_id: 3, custom_dropoff: false });
    expect(timeline.fare.amount).toBe(trip.fare);

    const item = { trip_id: trip.trip_id, seat_type: 'seated', origin_stop_id: 1, destination_stop_id: 3 };
    const paid = (await post('/passengers/checkout', { items: [item, item], booking_date: tomorrow })).data;
    expect(paid.checkout_url).toMatch(/\/checkout\/success\?ref=MOCK-/);
    expect((await get('/payments/status', { ref: paid.payment.transaction_reference })).data.status).toBe('paid');

    const tickets = (await get('/tickets/lookup', { transaction_reference: paid.payment.transaction_reference })).data;
    expect(tickets).toHaveLength(2);
    expect(tickets[0]).toMatchObject({ payment_id: paid.payment.payment_id, origin_stop: { stop_name: 'Ecoland Terminal' }, destination_stop: { stop_name: 'Digos City Terminal' } });
    const qr = (await get(`/passengers/tickets/${tickets[0].ticket_uuid}/qr`)).data;
    expect(qr.qr_content).toContain(tickets[0].ticket_uuid);

    expect((await get('/passengers/dashboard-summary')).data.tickets).toHaveLength(2);
  });
});
