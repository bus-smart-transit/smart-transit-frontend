import { describe, it, expect } from 'vitest';
import {
  buildDashboardView, ticketsSold, capacityOf, loadPct, gpsStatus, locationForTrip, tripsToday, HIGH_LOAD_PCT,
} from '../operatorDashboardView';

const TODAY = '2026-10-06';
const NOW = Date.parse('2026-10-06T08:00:00Z');

const fleet = (id, extra = {}) => ({ fleet_id: id, plate_number: `PLT-${id}`, capacity: 40, seated_capacity: 30, standing_capacity: 10, status: 'active', fleet_routes: [], ...extra });
const trip = (id, extra = {}) => ({
  trip_id: id,
  trip_date: TODAY,
  departure_time: '08:00:00',
  status: 'scheduled',
  total_occupancy: 0,
  driver: { user: { name: 'D' } },
  conductor: { user: { name: 'C' } },
  fleet_route: { fleet_id: 1, route_id: 10, fleet: fleet(1), route: { route_id: 10, route_name: 'Davao - Tagum' } },
  ...extra,
});
const fresh = (extra = {}) => ({ fleet_id: 1, trip_id: 1, latitude: 7.1, longitude: 125.6, accuracy_m: 5, recorded_at: new Date(NOW - 30_000).toISOString(), ...extra });

describe('trip figures', () => {
  it('tickets sold is the trip counter, capacity is the fleet capacity', () => {
    expect(ticketsSold(trip(1, { total_occupancy: 12 }))).toBe(12);
    expect(ticketsSold({ current_seated_capacity: 3, current_standing_capacity: 2 })).toBe(5);
    expect(capacityOf(trip(1))).toBe(40);
    expect(loadPct(trip(1, { total_occupancy: 20 }))).toBe(50);
  });

  it('load is null when the fleet has no capacity', () => {
    expect(loadPct({ total_occupancy: 5, fleet_route: { fleet: { capacity: 0 } } })).toBeNull();
  });

  it('only trips on the business day are today\'s, ordered by departure time', () => {
    const rows = tripsToday([trip(2, { departure_time: '09:00:00' }), trip(1, { departure_time: '07:00:00' }), trip(3, { trip_date: '2026-10-05' })], TODAY);
    expect(rows.map((row) => row.trip_id)).toEqual([1, 2]);
  });
});

describe('GPS status', () => {
  it('is none without a location, live when fresh, stale when old', () => {
    expect(gpsStatus(null, NOW).state).toBe('none');
    expect(gpsStatus(fresh(), NOW).state).toBe('live');
    expect(gpsStatus(fresh({ recorded_at: new Date(NOW - 600_000).toISOString() }), NOW).state).toBe('stale');
  });

  it('matches a location to its trip, then to its fleet', () => {
    const t = trip(1);
    expect(locationForTrip(t, [fresh({ trip_id: 99, fleet_id: 2 }), fresh({ trip_id: 1 })]).trip_id).toBe(1);
    expect(locationForTrip(t, [fresh({ trip_id: null, fleet_id: 1 })]).fleet_id).toBe(1);
    expect(locationForTrip(t, [fresh({ trip_id: 5, fleet_id: 2 })])).toBeNull();
  });
});

describe('buildDashboardView', () => {
  it('counts active buses, active trips, delayed trips and tickets sold for today only', () => {
    const view = buildDashboardView({
      trips: [
        trip(1, { status: 'departed', total_occupancy: 10 }),
        trip(2, { status: 'boarding', total_occupancy: 5, fleet_route: { fleet_id: 2, route_id: 10, fleet: fleet(2), route: { route_id: 10, route_name: 'Davao - Tagum' } } }),
        trip(3, { status: 'delayed', total_occupancy: 1 }),
        trip(4, { status: 'cancelled', total_occupancy: 30 }),
        trip(5, { status: 'completed', total_occupancy: 20, trip_date: '2026-10-05' }),
      ],
      fleets: [fleet(1), fleet(2), fleet(3)],
      locations: [fresh()],
      today: TODAY,
      nowMs: NOW,
    });
    expect(view.kpis.activeBuses).toBe(2);
    expect(view.kpis.activeTrips).toBe(2);
    expect(view.kpis.delayedTrips).toBe(1);
    expect(view.kpis.ticketsSold).toBe(16);
    expect(view.kpis.tripsToday).toBe(4);
    expect(view.kpis.totalFleets).toBe(3);
  });

  it('shows no revenue figure at all', () => {
    const view = buildDashboardView({ trips: [trip(1, { total_revenue: 500 })], fleets: [fleet(1)], today: TODAY, nowMs: NOW });
    const { todays: rawTrips, ...computed } = view;
    expect(rawTrips).toHaveLength(1);
    expect(JSON.stringify(computed)).not.toMatch(/revenue/i);
  });

  it('computes load factor per route from tickets sold and capacity', () => {
    const view = buildDashboardView({ trips: [trip(1, { total_occupancy: 20 }), trip(2, { total_occupancy: 20 })], fleets: [fleet(1)], today: TODAY, nowMs: NOW });
    expect(view.loadByRoute).toEqual([expect.objectContaining({ route: 'Davao - Tagum', sold: 40, capacity: 80, pct: 50 })]);
  });

  it('groups tickets sold by departure hour', () => {
    const view = buildDashboardView({
      trips: [trip(1, { departure_time: '08:15:00', total_occupancy: 4 }), trip(2, { departure_time: '08:45:00', total_occupancy: 6 }), trip(3, { departure_time: '10:00:00', total_occupancy: 1 })],
      fleets: [fleet(1)], today: TODAY, nowMs: NOW,
    });
    expect(view.soldByHour).toEqual([{ hour: '08:00', sold: 10 }, { hour: '10:00', sold: 1 }]);
  });

  it('raises alerts for a delayed trip, a crew gap, a silent bus and a near-full trip', () => {
    const view = buildDashboardView({
      trips: [
        trip(1, { status: 'delayed' }),
        trip(2, { status: 'scheduled', driver: null, driver_id: null }),
        trip(3, { status: 'departed' }),
        trip(4, { status: 'boarding', total_occupancy: Math.ceil(40 * HIGH_LOAD_PCT / 100) }),
      ],
      fleets: [fleet(1)], locations: [], today: TODAY, nowMs: NOW,
    });
    expect(view.alerts.map((alert) => alert.kind).sort()).toEqual(['crew', 'delayed', 'gps', 'load']);
    expect(view.alerts.find((alert) => alert.kind === 'crew').title).toContain('a driver');
  });

  it('raises no alert for a healthy day', () => {
    const view = buildDashboardView({ trips: [trip(1, { status: 'departed' })], fleets: [fleet(1)], locations: [fresh()], today: TODAY, nowMs: NOW });
    expect(view.alerts).toEqual([]);
    expect(view.actions).toEqual([]);
    expect(view.advice).toEqual([]);
  });

  it('gives one recommended action per route and kind', () => {
    const view = buildDashboardView({ trips: [trip(1, { status: 'delayed' }), trip(2, { status: 'delayed' })], fleets: [fleet(1)], today: TODAY, nowMs: NOW });
    expect(view.alerts.filter((alert) => alert.kind === 'delayed')).toHaveLength(2);
    expect(view.actions.filter((action) => action.key.endsWith('|delayed'))).toHaveLength(1);
  });

  it('advises review of a route with delayed trips, carries the recorded decision, and never claims an alternate route', () => {
    const view = buildDashboardView({
      trips: [trip(1, { status: 'delayed', dispatch_decision: 'keep', dispatch_decided_at: '2026-10-06T07:00:00Z' }), trip(2, { status: 'delayed' })],
      fleets: [fleet(1)], today: TODAY, nowMs: NOW,
    });
    expect(view.advice).toHaveLength(1);
    expect(view.advice[0].priority).toBe('high');
    expect(view.advice[0].text).toMatch(/your decision/);
    expect(view.advice[0].text).toMatch(/No alternate route is on file/);
    expect(view.decisions).toEqual([expect.objectContaining({ tripId: 1, label: 'Kept current route' })]);
  });

  it('treats a bus reporting far from the route as advice', () => {
    const view = buildDashboardView({
      trips: [trip(1, { status: 'departed' })], fleets: [fleet(1)], today: TODAY, nowMs: NOW,
      locations: [fresh({ route_position: { snapped_latitude: 7.0, snapped_longitude: 125.0, distance_to_route_m: 900, on_route: false } })],
    });
    expect(view.advice[0].reasons[0]).toMatch(/away from the route/);
  });

  it('recommends an idle fleet that serves a route under pressure', () => {
    const view = buildDashboardView({
      trips: [trip(1, { status: 'delayed' })],
      fleets: [fleet(1), fleet(2, { fleet_routes: [{ route_id: 10, status: 'active' }] })],
      today: TODAY, nowMs: NOW,
    });
    expect(view.deployment).toEqual([expect.objectContaining({ tone: 'info', text: expect.stringContaining('PLT-2') })]);
  });

  it('says so when no idle fleet serves a route under pressure', () => {
    const view = buildDashboardView({ trips: [trip(1, { status: 'delayed' })], fleets: [fleet(1)], today: TODAY, nowMs: NOW });
    expect(view.deployment[0].tone).toBe('warning');
  });

  it('only lists idle fleets when nothing is under pressure', () => {
    const view = buildDashboardView({ trips: [trip(1, { status: 'scheduled' })], fleets: [fleet(1), fleet(2)], today: TODAY, nowMs: NOW });
    expect(view.deployment).toEqual([expect.objectContaining({ key: 'deploy-idle', text: expect.stringContaining('PLT-2') })]);
  });

  it('route delay overview reflects the schedule status', () => {
    const view = buildDashboardView({ trips: [trip(1, { status: 'delayed' }), trip(2, { status: 'completed' })], fleets: [fleet(1)], today: TODAY, nowMs: NOW });
    expect(view.delayByRoute[0]).toEqual(expect.objectContaining({ delayed: 1, completed: 1, status: 'Delayed' }));
  });
});
