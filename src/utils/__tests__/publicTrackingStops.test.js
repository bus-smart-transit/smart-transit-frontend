import { describe, expect, it } from 'vitest';
import { stopPlaceFeatures, tripsFromStopHref } from '../publicTrackingView';

describe('stop pins on the Track Bus map (Batch 75)', () => {
  it('pins each place once and skips a place without a position', () => {
    const groups = [
      { municipality: 'Davao City', stops: [{ stop_id: 6, stop_code: 'buhangin-bus-stop', name: 'Buhangin Bus Stop', latitude: 7.1087, longitude: 125.6135 }] },
      { municipality: 'Panabo City', stops: [{ stop_id: 11, stop_code: 'panabo', name: 'Panabo City Terminal', latitude: null, longitude: null }] },
    ];
    const features = stopPlaceFeatures(groups);
    expect(features).toHaveLength(1);
    expect(features[0].properties).toEqual({ code: 'buhangin-bus-stop', name: 'Buhangin Bus Stop' });
    expect(features[0].geometry.coordinates).toEqual([125.6135, 7.1087]);
  });

  it('links to the available trips from that place', () => {
    expect(tripsFromStopHref('buhangin-bus-stop')).toBe('/passenger/trips?from=buhangin-bus-stop');
  });
});
