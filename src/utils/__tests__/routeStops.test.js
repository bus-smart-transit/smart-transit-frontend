import { describe, expect, test } from 'vitest';
import { routeStopRows } from '../routeStops';
import { distanceText, nearbyStops } from '../homeLocation';

// Batch 54 (user, 2026-11-10): View route stops and Stops near you on All available trips.
describe('routeStopRows', () => {
  const stops = [
    { stop_id: 1, stop_code: 'a', name: 'A', type: 'terminal', eta_time: '06:00', is_boarding: false, selectable: false },
    { stop_id: 2, stop_code: 'b', name: 'B', type: 'stop', eta_time: '06:10', is_boarding: true, selectable: false },
    { stop_id: 3, stop_code: 'c', name: 'C', type: 'pass_through', eta_time: null, scheduled_time: '06:20', selectable: false },
    { stop_id: 4, stop_code: 'd', name: 'D', type: 'terminal', eta_time: null, scheduled_time: null, selectable: true },
    { stop_id: null, name: 'Pin', type: 'custom', custom: true },
  ];

  test('lists real stops with their time, marks boarding, passing and earlier stops, and which can be chosen', () => {
    const rows = routeStopRows(stops);
    expect(rows.map((r) => r.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(rows[0]).toMatchObject({ before: true, boarding: false, time: '06:00', choosable: false });
    expect(rows[1]).toMatchObject({ boarding: true, before: false });
    expect(rows[2]).toMatchObject({ passesOnly: true, time: '06:20', choosable: false });
    expect(rows[3]).toMatchObject({ time: '', choosable: true, code: 'd' });
  });

  test('a stop without a code cannot be chosen', () => {
    expect(routeStopRows([{ stop_id: 9, name: 'X', type: 'stop', selectable: true }])[0].choosable).toBe(false);
  });
});

describe('nearbyStops and distanceText', () => {
  const groups = [{ stops: [
    { stop_id: 1, name: 'Near', latitude: 7.0, longitude: 125.0 },
    { stop_id: 2, name: 'Nearer', latitude: 7.001, longitude: 125.0 },
    { stop_id: 3, name: 'Far', latitude: 8.0, longitude: 125.0 },
    { stop_id: 4, name: 'No position' },
  ] }];

  test('gives the nearest stops within the radius, nearest first, at most the limit', () => {
    const rows = nearbyStops(groups, { lat: 7.002, lng: 125.0 }, 5, 3);
    expect(rows.map((r) => r.stop.name)).toEqual(['Nearer', 'Near']);
    expect(nearbyStops(groups, { lat: 7.002, lng: 125.0 }, 5, 1)).toHaveLength(1);
    expect(nearbyStops(groups, null)).toEqual([]);
  });

  test('says metres under a kilometre and kilometres above', () => {
    expect(distanceText(347)).toBe('350 m away');
    expect(distanceText(1234)).toBe('1.2 km away');
    expect(distanceText(NaN)).toBe('');
  });
});
