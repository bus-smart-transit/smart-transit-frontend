import { describe, expect, test } from 'vitest';
import { capacitySummary, destinationsAhead, orderedStopsForLeg, stopLabel } from '../cashTicket';
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
