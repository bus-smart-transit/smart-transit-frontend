import { describe, expect, test } from 'vitest';
import { groupTrips, sameTripGroup, tripGroupKey } from '../tripGroups';

// Batch 65 (user, 2026-11-13): one card per journey on Available trips; the time is chosen on trip details.
const trip = (id, time, over = {}) => ({
  trip_id: id, trip_date: '2026-11-28', boarding_time: time, bookable: true, route_name: 'Tagum - Panabo',
  origin: { stop_code: 'tagum' }, destination: { stop_code: 'panabo' }, vehicle_class: 'ordinary', service_type: 'regular', ...over,
});

describe('groupTrips', () => {
  test('puts departures of the same journey and bus type on one card, earliest first', () => {
    const groups = groupTrips([trip(12, '11:00'), trip(10, '06:00'), trip(14, '15:30')]);
    expect(groups).toHaveLength(1);
    expect(groups[0].lead.trip_id).toBe(10);
    expect(groups[0].otherTimes).toEqual(['11:00', '15:30']);
  });

  test('keeps apart what changes the fare or the stops: bus type, service, direction, date', () => {
    const groups = groupTrips([
      trip(1, '06:00'),
      trip(2, '07:00', { vehicle_class: 'aircon' }),
      trip(3, '08:00', { service_type: 'express' }),
      trip(4, '09:00', { origin: { stop_code: 'panabo' }, destination: { stop_code: 'tagum' } }),
      trip(5, '10:00', { trip_date: '2026-11-29' }),
    ]);
    expect(groups).toHaveLength(5);
    expect(groups.every((g) => g.otherTimes.length === 0)).toBe(true);
  });

  test('leads with the earliest departure that can still be booked', () => {
    const groups = groupTrips([trip(1, '06:00', { bookable: false }), trip(2, '08:30')]);
    expect(groups[0].lead.trip_id).toBe(2);
    expect(groups[0].otherTimes).toEqual(['06:00']);
  });

  test('compares a departure on the details page with the chosen one', () => {
    expect(sameTripGroup(trip(1, '06:00'), trip(2, '11:00'))).toBe(true);
    expect(sameTripGroup(trip(1, '06:00'), trip(2, '11:00', { vehicle_class: 'aircon' }))).toBe(false);
    expect(tripGroupKey({})).toBe('|||||');
    expect(groupTrips(null)).toEqual([]);
  });
});
