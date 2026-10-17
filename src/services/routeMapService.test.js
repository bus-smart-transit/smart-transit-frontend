import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRouteMapCache, fetchRouteMapData } from './routeMapService';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('./api.js', () => ({ default: { get: mocks.get } }));

describe('fetchRouteMapData', () => {
  beforeEach(() => {
    clearRouteMapCache();
    mocks.get.mockReset();
  });

  it('keeps original and snapped stop points with the stored-line offset', async () => {
    mocks.get
      .mockResolvedValueOnce({ data: { data: { geometry: { type: 'LineString', coordinates: [[125.6, 7.0], [125.7, 7.2]] } } } })
      .mockResolvedValueOnce({ data: { data: [{
        stop_id: 1,
        stop_name: 'Stop A',
        stop_order: 1,
        latitude: 7.001,
        longitude: 125.601,
        snapped_latitude: 7.0001,
        snapped_longitude: 125.6001,
        distance_to_line_m: 18.4,
      }] } });

    const result = await fetchRouteMapData(12);

    expect(result.stops[0]).toMatchObject({
      latitude: 7.0001,
      longitude: 125.6001,
      sourceLatitude: 7.001,
      sourceLongitude: 125.601,
      distanceToLineM: 18.4,
    });
    expect(mocks.get).toHaveBeenNthCalledWith(1, '/routes/12/geometry', { params: { direction: 'outbound' } });
    expect(mocks.get).toHaveBeenNthCalledWith(2, '/routes/12/stops', { params: { direction: 'outbound' } });
    expect(mocks.get).toHaveBeenCalledTimes(2);
  });
});