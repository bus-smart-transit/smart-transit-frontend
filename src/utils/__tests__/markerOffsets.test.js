import { describe, expect, it } from 'vitest';
import { markerOffsets } from '../markerOffsets';

describe('markerOffsets', () => {
  it('sets buses at the same spot side by side and leaves a bus on its own in place', () => {
    const offsets = markerOffsets([
      { id: 1, lat: 7.05557, lng: 125.60109 },
      { id: 2, lat: 7.05558, lng: 125.60110 }, // the same terminal, a metre away
      { id: 3, lat: 7.3, lng: 125.7 },
    ]);

    expect(offsets.get(1)).toEqual([-15, 0]);
    expect(offsets.get(2)).toEqual([15, 0]);
    expect(offsets.get(3)).toEqual([0, 0]);
  });

  it('spreads three buses evenly around the spot', () => {
    const offsets = markerOffsets([1, 2, 3].map((id) => ({ id, lat: 7.1, lng: 125.6 })));
    expect([...offsets.values()]).toEqual([[-30, 0], [0, 0], [30, 0]]);
  });

  it('skips points without a position', () => {
    expect(markerOffsets([{ id: 1, lat: null, lng: 125 }]).size).toBe(0);
  });
});
