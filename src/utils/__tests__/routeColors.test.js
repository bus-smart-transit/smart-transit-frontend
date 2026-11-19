import { describe, expect, it } from 'vitest';
import { ROUTE_PALETTE, routeColorMap } from '../routeColors';
import { busesForMap, todayByRoute } from '../operatorDashboardView';

// Batch 81 (user, 2026-11-19): one colour and R-code per route on the dashboard map and in Today's trips.
describe('routeColorMap', () => {
  it('gives each route a colour and code by route id order, the same however the ids arrive', () => {
    const a = routeColorMap([20, 10, 20, 30]);
    const b = routeColorMap([30, 10, 20]);
    expect([...a.entries()]).toEqual([...b.entries()]);
    expect(a.get(10)).toEqual({ color: ROUTE_PALETTE[0], code: 'R1' });
    expect(a.get(30).code).toBe('R3');
    expect(routeColorMap([null, 0, 'x']).size).toBe(0);
  });
});

const trip = (id, routeId, status, extra = {}) => ({ trip_id: id, status, departure_time: '08:00:00', fleet_route: { route_id: routeId, fleet_id: id, fleet: { plate_number: `P-${id}` }, route: { route_id: routeId, route_name: `Route ${routeId}`, origin: 'A', destination: 'B' } }, ...extra });

describe('todayByRoute and busesForMap (Batch 81)', () => {
  it('counts trips per route and calls a route Delayed when one of its trips is', () => {
    const rows = todayByRoute([trip(1, 2, 'scheduled'), trip(2, 2, 'delayed'), trip(3, 1, 'departed')]);
    expect(rows.map((r) => [r.routeId, r.trips, r.live, r.status])).toEqual([[1, 1, 1, 'On time'], [2, 2, 0, 'Delayed']]);
  });

  it('places running and delayed buses that report a position, and leaves out the rest', () => {
    const now = Date.parse('2026-11-19T04:00:00Z');
    const fresh = '2026-11-19T03:59:50Z';
    const buses = busesForMap(
      [trip(1, 1, 'departed'), trip(2, 1, 'delayed'), trip(3, 1, 'scheduled'), trip(4, 1, 'departed')],
      [{ trip_id: 1, fleet_id: 1, latitude: 7.1, longitude: 125.6, recorded_at: fresh }, { trip_id: 2, fleet_id: 2, latitude: 7.2, longitude: 125.5, recorded_at: fresh }, { trip_id: 3, fleet_id: 3, latitude: 7, longitude: 125, recorded_at: fresh }],
      now,
    );
    expect(buses.map((b) => [b.tripId, b.state])).toEqual([[1, 'in_service'], [2, 'delayed']]);
  });
});
