import { describe, expect, test } from 'vitest';
import { boardingPointView, buildOnsiteItem, capacityFromServer, capacitySummary, destinationsAhead, isMidTripBoardingAvailable, isOnsiteFormComplete, orderedStopsForLeg, stopLabel } from '../cashTicket';
import { formatManilaDateTime } from '../dates';

const rs = (id, order, type = 'stop', name = `Stop ${id}`) => ({ stop_id: id, stop_order: order, stop_type: type, stop: { stop_id: id, stop_name: name } });
const stops = [rs(3, 3, 'stop'), rs(1, 1, 'terminal'), rs(2, 2, 'pass_through'), rs(4, 4, 'terminal')];

describe('orderedStopsForLeg', () => {
  test('outbound: ascending order, pass-through points are not choices', () => {
    expect(orderedStopsForLeg(stops, 'outbound').map((s) => s.stop_id)).toEqual([1, 3, 4]);
    expect(orderedStopsForLeg(stops, undefined).map((s) => s.stop_id)).toEqual([1, 3, 4]);
  });

  test('reverse leg: the bus travels the route backwards', () => {
    expect(orderedStopsForLeg(stops, 'reverse').map((s) => s.stop_id)).toEqual([4, 3, 1]);
  });

  test('handles a missing list', () => {
    expect(orderedStopsForLeg(undefined, 'outbound')).toEqual([]);
  });
});

describe('destinationsAhead', () => {
  test('only stops after the boarding stop on this leg', () => {
    const outbound = orderedStopsForLeg(stops, 'outbound');
    expect(destinationsAhead(outbound, 1).map((s) => s.stop_id)).toEqual([3, 4]);
    expect(destinationsAhead(outbound, 4)).toEqual([]);
    const reverse = orderedStopsForLeg(stops, 'reverse');
    expect(destinationsAhead(reverse, 4).map((s) => s.stop_id)).toEqual([3, 1]);
  });

  test('no boarding stop chosen, or one that is not on the leg', () => {
    const outbound = orderedStopsForLeg(stops, 'outbound');
    expect(destinationsAhead(outbound, '')).toEqual([]);
    expect(destinationsAhead(outbound, 2)).toEqual([]); // pass-through
    expect(destinationsAhead(outbound, 99)).toEqual([]);
  });
});

describe('capacitySummary (a count, not seats)', () => {
  test('full when sold or onboard reaches capacity', () => {
    expect(capacitySummary({ capacity: 30, sold: 30, onboard: 12 }).isFull).toBe(true);
    expect(capacitySummary({ capacity: 30, sold: 5, onboard: 30 }).isFull).toBe(true);
    expect(capacitySummary({ capacity: 30, sold: 29, onboard: 10 })).toMatchObject({ isFull: false, remaining: 1 });
  });

  test('unknown capacity never reports full', () => {
    expect(capacitySummary({ capacity: 0, sold: 10, onboard: 10 })).toMatchObject({ isFull: false, remaining: null });
    expect(capacitySummary({})).toMatchObject({ capacity: 0, sold: 0, onboard: 0, isFull: false });
  });
});

test('stopLabel reads the nested stop name', () => {
  expect(stopLabel(rs(1, 1, 'stop', 'Alpha'))).toBe('Alpha');
  expect(stopLabel({ stop_id: 9 })).toBe('Stop 9');
});

describe('formatManilaDateTime (server UTC shown in Manila time)', () => {
  test('converts a UTC instant to Manila wall-clock time, whatever the device timezone', () => {
    expect(formatManilaDateTime('2026-10-04T09:30:00Z')).toBe('2026/10/04 - 17:30');
  });

  test('crosses midnight correctly: 20:00 UTC is 04:00 the next day in Manila', () => {
    expect(formatManilaDateTime('2026-10-03T20:00:00Z')).toBe('2026/10/04 - 04:00');
    expect(formatManilaDateTime('2026-10-03T16:00:00Z')).toBe('2026/10/04 - 00:00');
  });

  test('empty or invalid input is a dash', () => {
    expect(formatManilaDateTime(null)).toBe('-');
    expect(formatManilaDateTime('not a date')).toBe('-');
  });
});


describe('capacityFromServer (one definition of "occupied": tickets sold)', () => {
  const server = { capacity: { total: 40 }, sold: { total: 12 }, onboard: { total: 3 }, remaining: { total: 28 }, is_full: false };

  test('uses the server numbers and its is_full verdict as they are', () => {
    expect(capacityFromServer(server)).toEqual({ capacity: 40, sold: 12, onboard: 3, isFull: false, remaining: 28 });
    // Passengers onboard never decide "full": only what the server says.
    expect(capacityFromServer({ ...server, onboard: { total: 40 } }).isFull).toBe(false);
    expect(capacityFromServer({ ...server, is_full: true }).isFull).toBe(true);
  });

  test('falls back to the local count only when the server summary is missing', () => {
    expect(capacityFromServer(null, { capacity: 30, sold: 30, onboard: 1 }).isFull).toBe(true);
    expect(capacityFromServer(undefined, {})).toMatchObject({ capacity: 0, isFull: false });
  });
});

describe('mid-trip boarding picker', () => {
  test('is offered only while the bus is under way', () => {
    expect(isMidTripBoardingAvailable('departed')).toBe(true);
    expect(isMidTripBoardingAvailable('in-progress')).toBe(true);
    expect(isMidTripBoardingAvailable('boarding')).toBe(false);
    expect(isMidTripBoardingAvailable(undefined)).toBe(false);
  });

  test('a good fix offers the stops ahead and the pin; weak states offer nothing and say why', () => {
    const good = boardingPointView({
      state: 'good',
      boarding_point: { distance_from_origin_km: 15 },
      destinations: [{ stop_id: 4, stop_name: 'Stop D', distance_km: 15 }],
      custom_dropoff: { available: true },
    });
    expect(good).toMatchObject({ good: true, customDropoffAvailable: true, distanceFromOriginKm: 15 });
    expect(good.destinations).toHaveLength(1);

    for (const state of ['none', 'stale', 'poor_accuracy', 'off_route', 'no_geometry']) {
      const weak = boardingPointView({ state, message: 'Why not', destinations: [{ stop_id: 4 }] });
      expect(weak).toMatchObject({ good: false, state, message: 'Why not', destinations: [], customDropoffAvailable: false });
    }
    expect(boardingPointView(null)).toMatchObject({ good: false, state: 'none' });
  });

  test('the form is complete only with a usable boarding point and a destination', () => {
    const good = { good: true };
    const weak = { good: false };
    expect(isOnsiteFormComplete({ boarding_mode: 'gps', destination_stop_id: '4' }, good)).toBe(true);
    expect(isOnsiteFormComplete({ boarding_mode: 'gps', destination_stop_id: '4' }, weak)).toBe(false);
    expect(isOnsiteFormComplete({ boarding_mode: 'stop', origin_stop_id: '2', destination_stop_id: '4' }, weak)).toBe(true);
    expect(isOnsiteFormComplete({ boarding_mode: 'stop', origin_stop_id: '', destination_stop_id: '4' }, weak)).toBe(false);
    expect(isOnsiteFormComplete({ boarding_mode: 'stop', origin_stop_id: '2', dropoff: { lat: 1, lng: 2 } }, weak)).toBe(true);
  });
});

describe('buildOnsiteItem', () => {
  test('bus position: names no boarding stop and no coordinates, only the destination', () => {
    const item = buildOnsiteItem({ tripId: 7, form: { boarding_mode: 'gps', seat_type: 'seated', origin_stop_id: '2', destination_stop_id: '4', dropoff: null } });
    expect(item).toEqual({ trip_id: 7, seat_type: 'seated', boarding_mode: 'gps', destination_stop_id: 4 });
    expect(item).not.toHaveProperty('origin_stop_id');
    expect(item).not.toHaveProperty('origin_lat');
  });

  test('stop boarding keeps the stop; a pinned drop-off sends only the pin', () => {
    expect(buildOnsiteItem({ tripId: 7, form: { boarding_mode: 'stop', seat_type: 'standing', origin_stop_id: '2', destination_stop_id: '4' } }))
      .toEqual({ trip_id: 7, seat_type: 'standing', origin_stop_id: 2, destination_stop_id: 4 });
    const pinned = buildOnsiteItem({ tripId: 7, form: { boarding_mode: 'stop', seat_type: 'seated', origin_stop_id: '2', destination_stop_id: '', dropoff: { lat: 7.22, lng: 125.0003, label: 'Near the chapel' } } });
    expect(pinned).toEqual({ trip_id: 7, seat_type: 'seated', origin_stop_id: 2, destination_lat: 7.22, destination_lng: 125.0003, destination_label: 'Near the chapel' });
    expect(pinned).not.toHaveProperty('destination_stop_id');
  });
});