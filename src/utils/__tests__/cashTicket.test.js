import { describe, expect, test } from 'vitest';
import { boardingPointView, buildOnsiteItem, capacityFromServer, checkInLabel, capacitySummary, destinationsAhead, destinationsNotPassed, isMidTripBoardingAvailable, isOnsiteFormComplete, isStandingOpen, orderedStopsForLeg, placesLeft, stopLabel } from '../cashTicket';
import { formatManilaDateTime } from '../dates';

const rs = (id, order, type = 'stop', name = `Stop ${id}`) => ({ stop_id: id, stop_order: order, stop_type: type, stop: { stop_id: id, stop_name: name } });
const stops = [rs(3, 3, 'stop'), rs(1, 1, 'terminal'), rs(2, 2, 'pass_through'), rs(4, 4, 'terminal')];

describe('destinationsNotPassed (§6)', () => {
  const stops = [1, 2, 3, 4].map((id) => ({ stop_id: id, stop: { stop_name: `S${id}` } }));

  test('leaves out the stops the Driver has already passed', () => {
    expect(destinationsNotPassed(stops.slice(1), stops, 2).map((s) => s.stop_id)).toEqual([3, 4]);
  });

  test('offers every destination before the first acknowledgement', () => {
    expect(destinationsNotPassed(stops.slice(1), stops, null)).toHaveLength(3);
  });
});

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
    expect(capacityFromServer(server)).toEqual({ capacity: 40, sold: 12, onboard: 3, isFull: false, remaining: 28, standingOpen: false });
    // Passengers onboard never decide "full": only what the server says.
    expect(capacityFromServer({ ...server, onboard: { total: 40 } }).isFull).toBe(false);
    expect(capacityFromServer({ ...server, is_full: true }).isFull).toBe(true);
  });

  test('falls back to the local count only when the server summary is missing', () => {
    expect(capacityFromServer(null, { capacity: 30, sold: 30, onboard: 1 }).isFull).toBe(true);
    expect(capacityFromServer(undefined, {})).toMatchObject({ capacity: 0, isFull: false, standingOpen: false });
  });
});

describe('isStandingOpen (standing only once every seat is sold)', () => {
  const summary = (seatedLeft, standingLeft) => ({ capacity: { total: 40, seated: 30, standing: 10 }, remaining: { seated: seatedLeft, standing: standingLeft } });

  test('closed while any seat is left', () => {
    expect(isStandingOpen(summary(1, 10))).toBe(false);
    expect(capacityFromServer({ ...summary(5, 10), sold: { total: 25 }, onboard: { total: 0 }, is_full: false }).standingOpen).toBe(false);
  });

  test('open once the seats are sold and standing places remain', () => {
    expect(isStandingOpen(summary(0, 3))).toBe(true);
    expect(capacityFromServer({ ...summary(0, 3), sold: { total: 37 }, onboard: { total: 0 }, is_full: false }).standingOpen).toBe(true);
  });

  test('closed when standing is also full, or when there are no counts to go on', () => {
    expect(isStandingOpen(summary(0, 0))).toBe(false);
    expect(isStandingOpen(null)).toBe(false);
    expect(isStandingOpen({ capacity: { total: 40 } })).toBe(false);
  });
});

describe('mid-trip boarding picker', () => {
  test('is offered only while the bus is under way', () => {
    expect(isMidTripBoardingAvailable('departed')).toBe(true);
    expect(isMidTripBoardingAvailable('in-progress')).toBe(true);
    expect(isMidTripBoardingAvailable('boarding')).toBe(false);
    expect(isMidTripBoardingAvailable(undefined)).toBe(false);
  });

  test('a good fix offers only the stops ahead; weak states offer nothing and say why', () => {
    const good = boardingPointView({
      state: 'good',
      boarding_point: { distance_from_origin_km: 15 },
      destinations: [{ stop_id: 4, stop_name: 'Stop D', distance_km: 15 }],
    });
    expect(good).toMatchObject({ good: true, distanceFromOriginKm: 15 });
    expect(good).not.toHaveProperty('customDropoffAvailable');
    expect(good.destinations).toHaveLength(1);

    for (const state of ['none', 'stale', 'poor_accuracy', 'off_route', 'no_geometry']) {
      const weak = boardingPointView({ state, message: 'Why not', destinations: [{ stop_id: 4 }] });
      expect(weak).toMatchObject({ good: false, state, message: 'Why not', destinations: [] });
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
    expect(isOnsiteFormComplete({ boarding_mode: 'stop', origin_stop_id: '2', dropoff: { lat: 1, lng: 2 } }, weak)).toBe(false);
  });
});

describe('buildOnsiteItem', () => {
  test('bus position: names no boarding stop and no coordinates, only the destination', () => {
    const item = buildOnsiteItem({ tripId: 7, form: { boarding_mode: 'gps', seat_type: 'seated', origin_stop_id: '2', destination_stop_id: '4', dropoff: null } });
    expect(item).toEqual({ trip_id: 7, seat_type: 'seated', boarding_mode: 'gps', destination_stop_id: 4 });
    expect(item).not.toHaveProperty('origin_stop_id');
    expect(item).not.toHaveProperty('origin_lat');
  });

  test('stop boarding and destination both use official stops', () => {
    expect(buildOnsiteItem({ tripId: 7, form: { boarding_mode: 'stop', seat_type: 'standing', origin_stop_id: '2', destination_stop_id: '4' } }))
      .toEqual({ trip_id: 7, seat_type: 'standing', origin_stop_id: 2, destination_stop_id: 4 });
    const item = buildOnsiteItem({ tripId: 7, form: { boarding_mode: 'stop', seat_type: 'seated', origin_stop_id: '2', destination_stop_id: '4', dropoff: { lat: 7.22, lng: 125.0003 } } });
    expect(item).toEqual({ trip_id: 7, seat_type: 'seated', origin_stop_id: 2, destination_stop_id: 4 });
    expect(item).not.toHaveProperty('destination_lat');
    expect(item).not.toHaveProperty('alighting_point_id');
  });
});
describe('placesLeft (capacity minus tickets sold, not the sold count)', () => {
  const fleet = { seated_capacity: 30, standing_capacity: 10 };
  test('subtracts the sold counters from the bus capacity', () => {
    expect(placesLeft(fleet, { current_seated_capacity: 12, current_standing_capacity: 0 }, 'seated')).toBe(18);
    expect(placesLeft(fleet, { current_seated_capacity: 30, current_standing_capacity: 4 }, 'standing')).toBe(6);
  });
  test('never below zero, and unknown without the bus capacity', () => {
    expect(placesLeft(fleet, { current_seated_capacity: 31 }, 'seated')).toBe(0);
    expect(placesLeft({}, { current_seated_capacity: 3 }, 'seated')).toBe('—');
    expect(placesLeft(fleet, null, 'standing')).toBe(10);
  });
});

describe('Passenger In check-ins (2026-10-26)', () => {
  test('a checked-in sale names only the check-in: never a position or a stop', () => {
    expect(buildOnsiteItem({ tripId: 7, form: { boarding_mode: 'checkin', pending_boarding_id: '12', origin_stop_id: '3', seat_type: 'seated', destination_stop_id: '9' } }))
      .toEqual({ trip_id: 7, seat_type: 'seated', pending_boarding_id: 12, destination_stop_id: 9 });
  });

  test('is ready once a check-in and a destination are chosen', () => {
    expect(isOnsiteFormComplete({ boarding_mode: 'checkin', pending_boarding_id: '', destination_stop_id: '9' })).toBe(false);
    expect(isOnsiteFormComplete({ boarding_mode: 'checkin', pending_boarding_id: '12', destination_stop_id: '' })).toBe(false);
    expect(isOnsiteFormComplete({ boarding_mode: 'checkin', pending_boarding_id: '12', destination_stop_id: '9' })).toBe(true);
  });

  test('labels a check-in by its time and the stop the fare counts from', () => {
    expect(checkInLabel({ checked_in_at: '10:42', stop_name: 'Stop B' })).toBe('10:42 · after Stop B');
    expect(checkInLabel(null)).toBe('');
  });
});
