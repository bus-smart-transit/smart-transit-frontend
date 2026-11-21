import { describe, expect, it } from 'vitest';
import { ROUTE_PALETTE, routeColor, routeColorMap } from '../routeColors';
import { routeLineFeatures } from '../publicTrackingView';
import { busesForMap, todayByRoute } from '../operatorDashboardView';

// Batch 81 (user, 2026-11-19): one colour and R-code per route on the dashboard map and in Today's trips.
describe('routeColorMap', () => {
  it('gives each route a colour and code by route id order, the same however the ids arrive', () => {
    const a = routeColorMap([20, 10, 20, 30]);
    const b = routeColorMap([30, 10, 20]);
    expect([...a.entries()]).toEqual([...b.entries()]);
    expect(a.get(10)).toEqual({ color: routeColor(10), code: 'R1' });
    expect(routeColor(1)).toBe(ROUTE_PALETTE[0]);
    expect(routeColor(9)).toBe(ROUTE_PALETTE[0]);
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

// Batch 81 (user): the passengers' Track Bus map draws each route in the same colour as the Operator dashboard.
describe('Track Bus route colours', () => {
  it('colours each route line by its route, whatever else is listed', () => {
    const line = { coordinates: [[125, 7], [125.1, 7.1]] };
    const alone = routeLineFeatures([{ route_id: 3 }], { '3:outbound': line });
    const withOthers = routeLineFeatures([{ route_id: 1 }, { route_id: 3 }], { '1:outbound': line, '3:outbound': line });
    expect(alone[0].properties.color).toBe(routeColor(3));
    expect(withOthers.find((f) => f.properties.key === '3:outbound').properties.color).toBe(routeColor(3));
    expect(routeColorMap([3]).get(3).color).toBe(routeColor(3));
  });
});

// 2026-11-21 (user): the route's saved colour wins; the id colour is only a fallback.
describe('saved route colours', () => {
  it('uses the saved colour when it is a real colour', () => {
    expect(routeColor(9, '#123abc')).toBe('#123abc');
    expect(routeColor(9, 'red')).toBe(ROUTE_PALETTE[0]);
    expect(routeColor(9, null)).toBe(ROUTE_PALETTE[0]);
  });

  it('takes saved colours from a Map or an object', () => {
    expect(routeColorMap([1, 9], new Map([[9, '#123abc']])).get(9).color).toBe('#123abc');
    expect(routeColorMap([1, 9], { 9: '#123abc' }).get(9).color).toBe('#123abc');
    expect(routeColorMap([1, 9], { 9: '#123abc' }).get(1).color).toBe(ROUTE_PALETTE[0]);
  });

  it('colours the tracking route lines and dashboard rows with the saved colour', () => {
    const line = { type: 'LineString', coordinates: [[125, 7], [125.1, 7.1]] };
    const features = routeLineFeatures([{ route_id: 9, route_color: '#123abc', leg_direction: 'outbound' }], { '9:outbound': line });
    expect(features[0].properties.color).toBe('#123abc');
    const rows = todayByRoute([{ trip_id: 1, status: 'scheduled', fleet_route: { route_id: 9, route: { route_id: 9, route_name: 'R', color: '#123abc' } } }]);
    expect(rows[0].color).toBe('#123abc');
  });
});
