import { describe, it, expect } from 'vitest';
import {
  buildRouteRows, filterRouteRows, municipalityOptions, formatDuration, routeActivity, upcomingTripsFor, assignmentsOnRoute, sortedRouteStops,
} from '../operatorRouteView';

const TODAY = '2026-10-06';
const stop = (id, order, municipality, km, offset, extra = {}) => ({ id: id * 10, stop_id: id, stop_order: order, distance_from_origin_km: km, scheduled_offset_min: offset, stop: { stop_id: id, stop_name: `Stop ${id}`, municipality }, ...extra });

const tagum = {
  route_id: 4, route_name: 'Davao - Tagum', origin: 'Davao', destination: 'Tagum',
  route_stops: [stop(3, 3, 'Tagum City', '22.00', 58), stop(1, 1, 'Davao City', '0.00', 0), stop(2, 2, 'Carmen', '6.50', 18), stop(4, 4, 'Davao City', '25.00', null)],
};
const empty = { route_id: 5, route_name: 'Davao-Mati', origin: 'Davao', destination: 'Mati', route_stops: [] };
const stale = { route_id: 3, route_name: 'Ecoland - Toril', origin: 'Ecoland', destination: 'Toril', geometry_stale: true, route_stops: [] };

const fleet = (id, extra = {}) => ({ fleet_id: id, plate_number: `PLT-${id}`, status: 'active', fleet_routes: [{ fleet_route_id: id, route_id: 4, status: 'active', start_time: '05:00:00', end_time: '21:00:00' }], ...extra });

describe('sortedRouteStops', () => {
  it('orders by stop_order without changing the route', () => {
    expect(sortedRouteStops(tagum).map((row) => row.stop_id)).toEqual([1, 2, 3, 4]);
    expect(tagum.route_stops[0].stop_id).toBe(3);
  });
});

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(98)).toBe('1 h 38 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration('')).toBeNull();
  });
});

describe('buildRouteRows', () => {
  const rows = buildRouteRows({ routes: [tagum, empty, stale], fleets: [fleet(1), fleet(2, { status: 'inactive' }), fleet(3, { fleet_routes: [{ route_id: 4, status: 'inactive' }] })] });
  const byId = (id) => rows.find((row) => row.routeId === id);

  it('takes municipalities, distance and duration from the stops on the route', () => {
    expect(byId(4).municipalities).toEqual(['Davao City', 'Carmen', 'Tagum City']);
    expect(byId(4).stopCount).toBe(4);
    expect(byId(4).distanceKm).toBe(25);
    expect(byId(4).durationMin).toBe(58);
  });

  it('leaves distance and duration blank when the route has no stops', () => {
    expect(byId(5).distanceKm).toBeNull();
    expect(byId(5).durationMin).toBeNull();
    expect(byId(5).municipalities).toEqual([]);
  });

  it('is active only with an active fleet on an active assignment', () => {
    expect(byId(4).status.key).toBe('active');
    expect(byId(4).activeFleets.map((item) => item.plate)).toEqual(['PLT-1']);
    expect(byId(5).status.key).toBe('no_fleet');
  });

  it('flags a route whose line is stale', () => {
    expect(byId(3).geometryIssue).toBe(true);
    expect(byId(4).geometryIssue).toBe(false);
  });
});

describe('filters', () => {
  const rows = buildRouteRows({ routes: [tagum, empty], fleets: [] });
  it('lists the municipalities once, sorted', () => {
    expect(municipalityOptions(rows)).toEqual(['Carmen', 'Davao City', 'Tagum City']);
  });
  it('searches name, origin and destination', () => {
    expect(filterRouteRows(rows, { query: 'mati' }).map((row) => row.routeId)).toEqual([5]);
    expect(filterRouteRows(rows, { query: 'TAGUM' }).map((row) => row.routeId)).toEqual([4]);
    expect(filterRouteRows(rows, { query: '' })).toHaveLength(2);
  });
  it('filters by municipality', () => {
    expect(filterRouteRows(rows, { municipality: 'Carmen' }).map((row) => row.routeId)).toEqual([4]);
  });
});

describe('routeActivity', () => {
  const t = (id, status, date, time, sold, routeId = 4) => ({ trip_id: id, status, trip_date: date, departure_time: time, total_occupancy: sold, fleet_route: { route: { route_id: routeId } } });
  it('reports completion rate (not adherence), average tickets per day and the busiest hour', () => {
    const result = routeActivity(4, [
      t(1, 'completed', '2026-10-01', '08:00:00', 20), t(2, 'completed', '2026-10-01', '08:30:00', 10),
      t(3, 'cancelled', '2026-10-02', '08:00:00', 99), t(4, 'scheduled', '2026-10-02', '10:00:00', 4), t(5, 'completed', '2026-10-03', '08:00:00', 1, 9),
    ]);
    expect(result.totalTrips).toBe(4);
    expect(result.completionRatePct).toBe(50);
    expect(result.avgDailyTicketsSold).toBe(17);
    expect(result.peakHour).toEqual({ hour: '08:00', trips: 3 });
  });
  it('has nothing to say for a route with no trips', () => {
    expect(routeActivity(4, [])).toEqual({ totalTrips: 0, completionRatePct: null, avgDailyTicketsSold: null, peakHour: null });
  });
});

describe('upcomingTripsFor', () => {
  const t = (id, status, date, time) => ({ trip_id: id, status, trip_date: date, departure_time: time, fleet_route: { route: { route_id: 4 } } });
  it('lists open trips from today on, soonest first', () => {
    const rows = upcomingTripsFor(4, [t(1, 'scheduled', '2026-10-07', '06:00:00'), t(2, 'completed', TODAY, '05:00:00'), t(3, 'delayed', TODAY, '09:00:00'), t(4, 'scheduled', '2026-10-05', '09:00:00')], TODAY);
    expect(rows.map((row) => row.trip_id)).toEqual([3, 1]);
  });
});

describe('assignmentsOnRoute', () => {
  it('shows the service window and whether the assignment is active', () => {
    const rows = assignmentsOnRoute(4, [fleet(1), fleet(2, { status: 'inactive' })]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(expect.objectContaining({ start: '05:00', end: '21:00', active: true }));
    expect(rows[1].active).toBe(false);
  });
});
