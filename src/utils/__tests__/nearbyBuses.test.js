import { describe, expect, it } from 'vitest';
import { busArrival, busesNear, busTrip, distanceMeters, formatKm, minutesUntil, passengersText } from '../nearbyBuses';

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

// Batch 50 (user, 2026-11-08): an Active buses card shows when the bus left, where it goes and when it gets there.
describe('busTrip', () => {
  it('reads departed at, the destination and its arrival time', () => {
    expect(busTrip({ departed_at: '15:26', destination: 'Last Stop', destination_eta_time: '16:10', destination_eta_basis: 'live', arrived: false }))
      .toEqual({ departedAt: '15:26', destination: 'Last Stop', arrives: { time: '16:10', basis: 'Live estimate', minutes: null }, arrived: false, full: false });
    expect(busTrip({ destination: 'Last Stop', destination_eta_time: '16:40', destination_eta_basis: 'scheduled' }).arrives)
      .toEqual({ time: '16:40', basis: 'Scheduled', minutes: null });
  });

  it('says arrived, with no arrival time, at the last stop, and drops the old-location note', () => {
    expect(busTrip({ destination: 'Last Stop', destination_eta_time: null, arrived: true })).toMatchObject({ arrived: true, arrives: null });
    expect(busArrival({ eta_time: '15:26', eta_basis: 'scheduled', gps_stale: true, arrived: true }).note).toBeNull();
  });

  it('gives nothing when unknown, never a guess', () => {
    expect(busTrip(null)).toEqual({ departedAt: null, destination: null, arrives: null, arrived: false, full: false });
  });

  // Batch 51 items 1 and 5: minutes to the destination from its full time, and the full flag.
  it('counts minutes to the destination and reads full', () => {
    const now = Date.parse('2026-11-09T06:00:00Z');
    const trip = busTrip({ destination: 'Last Stop', destination_eta_time: '14:25', destination_eta: '2026-11-09T06:25:00Z', destination_eta_basis: 'live', full: true }, now);
    expect(trip.arrives.minutes).toBe(25);
    expect(trip.full).toBe(true);
  });
});

describe('minutesUntil', () => {
  it('says how long until a live time', () => {
    const now = Date.parse('2026-11-08T08:00:00Z');
    expect(minutesUntil('2026-11-08T08:12:00Z', now)).toBe('in about 12 min');
    expect(minutesUntil('2026-11-08T07:59:00Z', now)).toBe('now');
    expect(minutesUntil(null, now)).toBe('');
  });
});
