import { describe, expect, it } from 'vitest';
import { locationQuestion, nearestStop } from '../homeLocation';

// Batch 51 items 2 and 3: the nearest stop within 5 km (measured on the device) and "Are you in {place}?".
const groups = [
  { stops: [{ stop_id: 1, name: 'Stop A', latitude: 7.0, longitude: 125.0 }, { stop_id: 2, name: 'Stop B', latitude: 7.02, longitude: 125.0 }] },
  { stops: [{ stop_id: 3, name: 'Stop C', latitude: null, longitude: null }, { stop_id: 4, name: 'Stop D', latitude: 7.2, longitude: 125.0 }] },
];

describe('nearestStop', () => {
  it('picks the nearest stop within the radius, skipping stops without a position', () => {
    const found = nearestStop(groups, { lat: 7.015, lng: 125.0 }, 5);
    expect(found.stop.name).toBe('Stop B');
    expect(Math.round(found.meters)).toBeLessThan(700);
  });

  it('gives nothing when no stop is within the radius, or no position is known', () => {
    expect(nearestStop(groups, { lat: 7.1, lng: 125.0 }, 5)).toBeNull(); // about 9 km from the nearest
    expect(nearestStop(groups, null, 5)).toBeNull();
  });
});

describe('locationQuestion', () => {
  it('names the town, else the nearest stop, else asks nothing', () => {
    expect(locationQuestion({ place: 'Sample City' }, null)).toBe('Are you in Sample City?');
    expect(locationQuestion(null, { stop: { name: 'Stop B' } })).toBe('Are you near Stop B?');
    expect(locationQuestion(null, null)).toBe('');
  });
});
