import { describe, expect, it } from 'vitest';
import { busCounts, busStatusText, routeKeyOf, routeLineFeatures } from '../publicTrackingView';

// 2026-11-08 (user): waiting buses at their first stop, and every bus's route line on the public map.
describe('public Track Bus view', () => {
  it('counts live and waiting buses apart', () => {
    expect(busCounts([{ waiting: false }, { waiting: true }, {}])).toEqual({ live: 2, waiting: 1 });
    expect(busCounts()).toEqual({ live: 0, waiting: 0 });
  });

  it('says where a waiting bus is and when it leaves, or that it is late', () => {
    expect(busStatusText({ waiting: true, waiting_at: 'Stop A', departs_at: '19:25', trip_status: 'scheduled' })).toBe('Waiting at Stop A · leaves 19:25');
    expect(busStatusText({ waiting: true, waiting_at: 'Stop A', departs_at: '19:25', trip_status: 'delayed' })).toBe('Waiting at Stop A · running late (was due 19:25)');
    expect(busStatusText({ waiting: true })).toBe('Waiting to leave');
  });

  it('says departed or arrived for a running bus', () => {
    expect(busStatusText({ trip_status: 'departed' }, { departedAt: '19:25' })).toBe('Departed at 19:25');
    expect(busStatusText({ trip_status: 'departed' }, { arrived: true, departedAt: '19:25' })).toBe('Arrived');
    expect(busStatusText({ trip_status: 'departed' }, {})).toBe('Departed');
  });

  it('draws each stored route line once and skips routes without one', () => {
    const line = { type: 'LineString', coordinates: [[125, 7], [125.1, 7.1]] };
    const rows = [
      { route_id: 3, leg_direction: 'outbound' },
      { route_id: 3 },
      { route_id: 3, leg_direction: 'reverse' },
      { route_id: 5 },
      { route_id: null },
    ];
    const features = routeLineFeatures(rows, { '3:outbound': line, '3:reverse': line, '5:outbound': { coordinates: [[125, 7]] } });
    expect(features.map((f) => f.properties.key)).toEqual(['3:outbound', '3:reverse']);
    expect(routeKeyOf({ route_id: '5', leg_direction: 'x' })).toBe('5:outbound');
  });
});
