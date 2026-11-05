import { describe, expect, it } from 'vitest';
import { busArrival, busesNear, distanceMeters, formatKm, passengersText } from '../nearbyBuses';

const me = { lat: 7.0731, lng: 125.6128 }; // Davao City
const bus = (id, lat, lng, extra = {}) => ({ fleet_id: id, latitude: lat, longitude: lng, ...extra });

describe('nearbyBuses (Batch 45 Feature C)', () => {
  it('keeps only buses within the radius, nearest first', () => {
    const fleets = [bus(1, 7.1, 125.62), bus(2, 7.0731, 125.6128), bus(3, 7.45, 125.81)];

    const near = busesNear(fleets, me, 5);

    expect(near.map((b) => b.fleet_id)).toEqual([2, 1]);
    expect(near[0]._distanceM).toBe(0);
    expect(near[1]._distanceM).toBeGreaterThan(2000);
  });

  it('lists nothing without the passenger location', () => {
    expect(busesNear([bus(1, 7.1, 125.62)], null, 5)).toEqual([]);
  });

  it('ignores a bus without a position', () => {
    expect(busesNear([bus(1, null, null)], me, 5)).toEqual([]);
    expect(distanceMeters(me, { lat: 'x', lng: 1 })).toBeNull();
  });

  it('labels a live estimate and shows the scheduled time and the delay apart', () => {
    expect(busArrival({ eta_time: '12:50', eta_basis: 'live', scheduled_time: '12:45', delay_minutes: 5, gps_stale: false })).toEqual({
      time: '12:50', basis: 'Live estimate', scheduled: 'Scheduled 12:45', delay: '5 min late', note: null,
    });
    expect(busArrival({ eta_time: '12:43', eta_basis: 'live', scheduled_time: '12:45', delay_minutes: -2 }).delay).toBe('2 min early');
  });

  it('falls back to the scheduled time when the GPS is old, and says why', () => {
    expect(busArrival({ eta_time: '12:45', eta_basis: 'scheduled', scheduled_time: '12:45', delay_minutes: null, gps_stale: true })).toEqual({
      time: '12:45', basis: 'Scheduled', scheduled: null, delay: null, note: 'Bus location is old, so this is the scheduled time.',
    });
  });

  it('says nothing is known instead of guessing', () => {
    expect(busArrival(null).time).toBeNull();
    expect(busArrival({ eta_time: null }).basis).toBeNull();
    expect(passengersText(null)).toBe('Not provided');
    expect(passengersText({ passengers: 0 })).toBe('0');
    expect(passengersText({ passengers: 12 })).toBe('12');
  });

  it('formats the distance in plain words', () => {
    expect(formatKm(420)).toBe('420 m away');
    expect(formatKm(2345)).toBe('2.3 km away');
    expect(formatKm(null)).toBe('');
  });
});
