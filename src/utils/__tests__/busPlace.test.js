import { describe, it, expect } from 'vitest';
import { describeBusPlace } from '../busPlace';

// Three stops along one meridian, about 11 km apart.
const stops = [
  { name: 'Ecoland Terminal', latitude: 7.0, longitude: 125.0 },
  { name: 'Buhangin Crossing', latitude: 7.1, longitude: 125.0 },
  { name: 'Bunawan Public Market', latitude: 7.2, longitude: 125.0 },
];

describe('describeBusPlace', () => {
  it('says "At" a stop when the bus is within its doorstep distance', () => {
    expect(describeBusPlace(stops, 7.1005, 125.0)).toEqual(expect.objectContaining({ kind: 'at', text: 'At Buhangin Crossing' }));
  });

  it('says "Near" a stop within about 500 m', () => {
    expect(describeBusPlace(stops, 7.1030, 125.0)).toEqual(expect.objectContaining({ kind: 'near', text: 'Near Buhangin Crossing' }));
  });

  it('says "Between" the two consecutive stops the bus is travelling along', () => {
    expect(describeBusPlace(stops, 7.15, 125.0)).toEqual(expect.objectContaining({ kind: 'between', text: 'Between Buhangin Crossing and Bunawan Public Market' }));
    expect(describeBusPlace(stops, 7.05, 125.0)).toEqual(expect.objectContaining({ kind: 'between', text: 'Between Ecoland Terminal and Buhangin Crossing' }));
  });

  it('reads in the order the stops are given, so a reverse leg reads in travel order', () => {
    const reversed = [...stops].reverse();
    expect(describeBusPlace(reversed, 7.15, 125.0).text).toBe('Between Bunawan Public Market and Buhangin Crossing');
  });

  it('says the bus is away from the route when it is far from every corridor', () => {
    const result = describeBusPlace(stops, 7.1, 125.2);
    expect(result.kind).toBe('away');
    expect(result.text).toContain('Away from the route');
    expect(result.text).toContain('Buhangin Crossing');
  });

  it('never returns coordinates in its text', () => {
    for (const lat of [7.0, 7.03, 7.15, 7.25]) {
      expect(describeBusPlace(stops, lat, 125.0).text).not.toMatch(/\d+\.\d{3,}/);
    }
  });

  it('returns null when there is nothing to describe', () => {
    expect(describeBusPlace([], 7.1, 125.0)).toBeNull();
    expect(describeBusPlace(undefined, 7.1, 125.0)).toBeNull();
    expect(describeBusPlace(stops, null, 125.0)).toBeNull();
    expect(describeBusPlace(stops, 'x', 125.0)).toBeNull();
  });

  it('ignores stops without a name or a position, and accepts stop_name', () => {
    const mixed = [{ name: '', latitude: 7.0, longitude: 125.0 }, { stop_name: 'Named Stop', latitude: 7.1, longitude: 125.0 }, { name: 'No Position' }];
    expect(describeBusPlace(mixed, 7.1002, 125.0).text).toBe('At Named Stop');
  });

  it('with a single stop it can only say at, near or away', () => {
    expect(describeBusPlace([stops[0]], 7.0, 125.0).kind).toBe('at');
    expect(describeBusPlace([stops[0]], 7.5, 125.0).kind).toBe('away');
  });
});
