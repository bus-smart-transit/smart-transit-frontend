import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const apiGet = vi.hoisted(() => vi.fn());
vi.mock('../api', () => ({ default: { get: apiGet } }));

import { fetchTrafficStatus, resetTrafficCache } from '../trafficService';

const stop = (latitude, longitude) => ({ latitude, longitude });
const route = { route_name: 'Davao - Tagum' };
const ask = (next = stop(7.1, 125.62), extra = {}) => fetchTrafficStatus({ currentLat: 7.07, currentLng: 125.6, nextStop: next, route, stops: [], ...extra });
const answer = (data) => ({ data: { data } });
const available = (extra = {}) => answer({ available: true, provider: 'tomtom', travel_time_s: 840, no_traffic_s: 720, delay_s: 120, length_m: 6600, ...extra });

describe('server-side traffic (TomTom through our API)', () => {
  beforeEach(() => {
    resetTrafficCache();
    apiGet.mockReset();
    vi.stubEnv('VITE_TRAFFIC_PROVIDER', 'backend');
    vi.stubEnv('VITE_TRAFFIC_API_BASE', '');
    vi.stubEnv('VITE_TRAFFIC_API_KEY', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  test('asks our API for the segment and needs no browser-side key or address', async () => {
    apiGet.mockResolvedValue(available());

    await ask();

    expect(apiGet).toHaveBeenCalledWith('/traffic/segment', { params: { from_lat: 7.07, from_lng: 125.6, to_lat: 7.1, to_lng: 125.62 } });
  });

  test('defaults to the backend and labels the measured next-stop segment', async () => {
    vi.stubEnv('VITE_TRAFFIC_PROVIDER', '');
    vi.stubEnv('MODE', 'development');
    const fetchedAt = '2026-10-18T08:00:00Z';
    apiGet.mockResolvedValue(available({ fetched_at: fetchedAt }));

    const result = await fetchTrafficStatus({
      currentLat: 7.07,
      currentLng: 125.6,
      nextStop: { latitude: 7.1, longitude: 125.62, stop_name: 'Bunawan' },
      route,
      stops: [],
    });

    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(result.segmentLabel).toBe('Current position to Bunawan');
    expect(result.updatedAt).toBe(fetchedAt);
    expect(result.alerts[0].road).toBe(result.segmentLabel);
    expect(result.alerts[0].detail).toContain('ETA 14 min to Bunawan');
  });

  test('labels congestion against the provider\'s own no-traffic time', async () => {
    apiGet.mockResolvedValue(available({ travel_time_s: 1200, no_traffic_s: 600 }));

    const heavy = await ask();

    expect(heavy.level).toBe('heavy');
    expect(heavy.label).toBe('Heavy traffic');
    expect(heavy.etaMinutes).toBe(20);
    expect(heavy.delayMinutes).toBe(10);
    expect(heavy.dataSource).toBe('tomtom');
  });

  test('reads normal flow when live and no-traffic times match', async () => {
    apiGet.mockResolvedValue(available({ travel_time_s: 720, no_traffic_s: 715 }));

    const result = await ask();

    expect(result.level).toBe('normal');
    expect(result.label).toBe('Normal flow');
    expect(result.delayMinutes).toBe(0);
  });

  test('without a no-traffic time the level stays unknown and no delay is invented', async () => {
    apiGet.mockResolvedValue(available({ no_traffic_s: null }));

    const result = await ask();

    expect(result.level).toBe('unknown');
    expect(result.delayMinutes).toBeNull();
    expect(result.etaMinutes).toBe(14);
  });

  test('says unavailable, with the reason, and shows no ETA when the server cannot answer', async () => {
    apiGet.mockResolvedValue(answer({ available: false, provider: 'tomtom', reason: 'budget_reached' }));

    const result = await ask();

    expect(result.level).toBe('unknown');
    expect(result.etaMinutes).toBeNull();
    expect(result.delayMinutes).toBeNull();
    expect(result.alerts[0].detail).toContain('allowance is used up');
    expect(result.dataSource).toBe('fallback');
  });

  test('says unavailable when the request itself fails', async () => {
    apiGet.mockRejectedValue(new Error('network'));

    const result = await ask();

    expect(result.etaMinutes).toBeNull();
    expect(result.dataSource).toBe('fallback');
  });

  test('does not ask again within the refresh window while the next stop is unchanged, however often the GPS updates', async () => {
    apiGet.mockResolvedValue(available());

    for (let i = 0; i < 6; i += 1) {
      await ask(stop(7.1, 125.62), { currentLat: 7.07 + i * 0.001, currentLng: 125.6 + i * 0.001 });
    }

    expect(apiGet).toHaveBeenCalledTimes(1);
  });

  test('asks again as soon as the next stop changes', async () => {
    apiGet.mockResolvedValue(available());

    await ask(stop(7.1, 125.62));
    await ask(stop(7.15, 125.66));

    expect(apiGet).toHaveBeenCalledTimes(2);
  });

  test('asks again once the refresh window has passed', async () => {
    vi.useFakeTimers();
    apiGet.mockResolvedValue(available());

    await ask();
    vi.advanceTimersByTime(91_000);
    await ask();

    expect(apiGet).toHaveBeenCalledTimes(2);
  });

  test('backs off after repeated failures instead of hammering the server', async () => {
    apiGet.mockRejectedValue(new Error('network'));

    await ask(stop(7.1, 125.62));
    await ask(stop(7.2, 125.7));
    await ask(stop(7.3, 125.8));

    expect(apiGet).toHaveBeenCalledTimes(2);
  });
});
