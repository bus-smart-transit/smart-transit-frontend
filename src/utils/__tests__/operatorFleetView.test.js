import { describe, it, expect } from 'vitest';
import { buildFleetRows, filterFleetRows, FLEET_STATUS } from '../operatorFleetView';

const TODAY = '2026-10-06';
const NOW = Date.parse('2026-10-06T08:00:00Z');

const fleet = (id, extra = {}) => ({ fleet_id: id, plate_number: `PLT-${id}`, capacity: 40, seated_capacity: 30, standing_capacity: 10, status: 'active', fleet_routes: [{ route: { route_name: 'Davao - Tagum' } }], ...extra });
const trip = (id, fleetId, status, extra = {}) => ({
  trip_id: id, trip_date: TODAY, departure_time: '08:00:00', status, total_occupancy: 10,
  fleet_route: { fleet_id: fleetId, route_id: 10, fleet: fleet(fleetId), route: { route_id: 10, route_name: 'Davao - Tagum' } },
  ...extra,
});
const gps = (fleetId, extra = {}) => ({ fleet_id: fleetId, trip_id: null, latitude: 7.1, longitude: 125.6, accuracy_m: 5, recorded_at: new Date(NOW - 30_000).toISOString(), ...extra });

const rowOf = (rows, id) => rows.find((row) => row.fleetId === id);

describe('buildFleetRows', () => {
  const rows = buildFleetRows({
    fleets: [fleet(1), fleet(2), fleet(3), fleet(4), fleet(5, { status: 'retired' })],
    trips: [trip(1, 1, 'departed'), trip(2, 2, 'scheduled'), trip(4, 4, 'in-progress'), trip(9, 3, 'completed'), trip(10, 1, 'scheduled', { trip_date: '2026-10-05' })],
    locations: [gps(1)],
    today: TODAY,
    nowMs: NOW,
  });

  it('is on route when a trip is live and the bus is reporting', () => {
    expect(rowOf(rows, 1).status.key).toBe('on_route');
    expect(rowOf(rows, 1).trackable).toBe(true);
  });

  it('is active when a trip is still to run but none is under way', () => {
    expect(rowOf(rows, 2).status.key).toBe('active');
    expect(rowOf(rows, 2).trackable).toBe(false);
    expect(rowOf(rows, 2).nextTripLabel).toBe('Davao - Tagum - 08:00');
  });

  it('is idle when nothing is left to run today (a finished trip does not count)', () => {
    expect(rowOf(rows, 3).status.key).toBe('idle');
    expect(rowOf(rows, 3).nextTripLabel).toBeNull();
  });

  it('is offline when a trip is live but there is no GPS report', () => {
    expect(rowOf(rows, 4).status.key).toBe('offline');
  });

  it('is offline when the last report is stale', () => {
    const stale = buildFleetRows({ fleets: [fleet(1)], trips: [trip(1, 1, 'departed')], locations: [gps(1, { recorded_at: new Date(NOW - 600_000).toISOString() })], today: TODAY, nowMs: NOW });
    expect(stale[0].status.key).toBe('offline');
    expect(stale[0].lastSeen).toBe('10m ago');
  });

  it('shows a fleet whose stored status is not active as inactive, whatever its trips', () => {
    expect(rowOf(rows, 5).status.key).toBe('inactive');
  });

  it('ignores trips of other days', () => {
    expect(rowOf(rows, 1).tripsToday).toBe(1);
  });

  it('lists the route names the fleet is assigned to', () => {
    expect(rowOf(rows, 1).routes).toEqual(['Davao - Tagum']);
  });

  it('never produces a maintenance state', () => {
    expect(Object.keys(FLEET_STATUS)).not.toContain('maintenance');
  });
});

describe('filterFleetRows', () => {
  const rows = buildFleetRows({ fleets: [fleet(1), fleet(3)], trips: [trip(1, 1, 'scheduled')], locations: [], today: TODAY, nowMs: NOW });

  it('returns every row for "all" and only the matching status otherwise', () => {
    expect(filterFleetRows(rows, 'all')).toHaveLength(2);
    expect(filterFleetRows(rows, 'idle').map((row) => row.fleetId)).toEqual([3]);
    expect(filterFleetRows(rows, 'offline')).toEqual([]);
  });
});
