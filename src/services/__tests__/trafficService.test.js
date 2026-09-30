import { afterEach, describe, expect, test, vi } from 'vitest';
import { fetchTrafficStatus } from '../trafficService';

describe('trafficService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test('uses the ORS live route endpoint when traffic provider is configured', async () => {
    vi.stubEnv('VITE_TRAFFIC_PROVIDER', 'ors');
    vi.stubEnv('VITE_TRAFFIC_API_BASE', 'https://api.openrouteservice.org');
    vi.stubEnv('VITE_TRAFFIC_API_KEY', 'demo-key');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [{
          summary: { duration: 660 },
          segments: [{
            steps: [
              { name: 'Quirino Avenue', duration: 540 },
              { name: 'Roxas Avenue', duration: 240 },
            ],
          }],
        }],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const route = { route_name: 'Route 7', origin: 'Davao', destination: 'Mati' };

    const result = await fetchTrafficStatus({
      currentLat: 7.087,
      currentLng: 125.615,
      nextStop: {
        latitude: 7.091,
        longitude: 125.62,
      },
      route,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const requestUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(requestUrl.origin).toBe('https://api.openrouteservice.org');
    expect(requestUrl.pathname).toBe('/v2/directions/driving-car');
    expect(requestUrl.searchParams.get('api_key')).toBe('demo-key');
    expect(requestUrl.searchParams.get('start')).toContain('125.615,7.087');
    expect(requestUrl.searchParams.get('end')).toContain('125.62,7.091');
    expect(requestUrl.searchParams.get('instructions')).toBe('true');
    expect(fetchMock.mock.calls[0][1]?.headers?.Accept).toContain('application/geo+json');

    // ORS has no traffic data, so there is no baseline: travel time only, no level, no delay.
    expect(result.level).toBe('unknown');
    expect(result.label).toBe('Travel time only');
    expect(result.delayMinutes).toBeNull();
    expect(result.etaMinutes).toBe(11);
    expect(result.routeName).toBe('Route 7');
    expect(result.suggestion).toContain('Route 7');
    expect(result).not.toHaveProperty('rerouteRoute');
    expect(result).not.toHaveProperty('alternateRoute');
    expect(Array.isArray(result.alerts)).toBe(true);
    expect(result.alerts[0].road).toContain('Quirino');
    expect(result.dataSource).toBe('ors');
  });

  test('retries ORS requests with bounded backoff after a 406 response', async () => {
    vi.stubEnv('VITE_TRAFFIC_PROVIDER', 'ors');
    vi.stubEnv('VITE_TRAFFIC_API_BASE', 'https://api.openrouteservice.org');
    vi.stubEnv('VITE_TRAFFIC_API_KEY', 'demo-key');

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 406, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [{
            summary: { duration: 420 },
            geometry: { type: 'LineString', coordinates: [[125.615, 7.087], [125.62, 7.091]] },
            segments: [{ steps: [{ name: 'Demo Road', duration: 420 }] }],
          }],
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchTrafficStatus({
      currentLat: 7.087,
      currentLng: 125.615,
      nextStop: { latitude: 7.091, longitude: 125.62 },
      route: { route_name: 'Retry Route' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.dataSource).toBe('ors');
  });

  // Batch C: THESIS_OBJECTIVES_AUDIT.md item #6 — traffic alerts silently
  // degrade to a distance-based estimate with no user-facing indication when
  // no provider is configured. This test locks in the `dataSource: 'fallback'`
  // signal that DriverDashboard.jsx now uses to show a visible
  // "Estimated — live traffic data is unavailable" banner.
  test('flags dataSource as fallback when no traffic provider is configured', async () => {
    vi.stubEnv('VITE_TRAFFIC_PROVIDER', '');
    vi.stubEnv('VITE_TRAFFIC_API_BASE', '');
    vi.stubEnv('VITE_TRAFFIC_API_KEY', '');

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchTrafficStatus({
      currentLat: 7.087,
      currentLng: 125.615,
      nextStop: { latitude: 7.091, longitude: 125.62 },
      route: { route_name: 'Route 7', origin: 'Davao', destination: 'Mati' },
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.dataSource).toBe('fallback');
    expect(result.etaMinutes).toBeNull();
    expect(result.delayMinutes).toBeNull();
    expect(result.label).toBe('Live traffic unavailable');
    expect(result.suggestion.toLowerCase()).toContain('unavailable');
  });

  test('provider success without a duration is "unavailable", never a default ETA', async () => {
    vi.stubEnv('VITE_TRAFFIC_PROVIDER', 'ors');
    vi.stubEnv('VITE_TRAFFIC_API_BASE', 'https://api.openrouteservice.org');
    vi.stubEnv('VITE_TRAFFIC_API_KEY', 'demo-key');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ routes: [{ summary: {}, segments: [{ steps: [] }] }] }),
    }));

    const result = await fetchTrafficStatus({
      currentLat: 7.087,
      currentLng: 125.615,
      nextStop: { latitude: 7.091, longitude: 125.62 },
      route: { route_name: 'Route 9' },
    });

    expect(result.etaMinutes).toBeNull();
    expect(result.delayMinutes).toBeNull();
    expect(result.label).toBe('ETA unavailable');
    expect(result.level).toBe('unknown');
    expect(result.dataSource).toBe('ors');
  });

  test('names the corridor from the route stops municipalities, and shows no name without them', async () => {
    vi.stubEnv('VITE_TRAFFIC_PROVIDER', 'ors');
    vi.stubEnv('VITE_TRAFFIC_API_BASE', 'https://api.openrouteservice.org');
    vi.stubEnv('VITE_TRAFFIC_API_KEY', 'demo-key');

    const ok = () => vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ routes: [{ summary: { duration: 900 }, segments: [{ steps: [] }] }] }),
    });
    const base = { currentLat: 7.087, currentLng: 125.615, nextStop: { latitude: 7.091, longitude: 125.62 }, route: { route_name: 'Route 9' } };

    vi.stubGlobal('fetch', ok());
    const named = await fetchTrafficStatus({
      ...base,
      stops: [
        { stop_order: 1, municipality: 'Town A' },
        { stop_order: 2, municipality: 'Town B' },
      ],
    });
    expect(named.corridorName).toBe('Town A – Town B');
    expect(named.suggestion).toContain('(Town A – Town B)');

    vi.stubGlobal('fetch', ok());
    const unnamed = await fetchTrafficStatus({ ...base, stops: [{ stop_order: 1 }] });
    expect(unnamed.corridorName).toBeNull();
    expect(unnamed.suggestion).not.toContain('(');
  });

  describe('Mapbox: congestion is judged against the free-flow time, never a fixed ETA cut-off', () => {
    const base = { currentLat: 7.087, currentLng: 125.615, nextStop: { latitude: 7.091, longitude: 125.62 }, route: { route_name: 'Route 7' } };
    const stubMapbox = (liveSeconds, freeSeconds) => {
      vi.stubEnv('VITE_TRAFFIC_PROVIDER', 'mapbox');
      vi.stubEnv('VITE_TRAFFIC_API_BASE', 'https://api.mapbox.com');
      vi.stubEnv('VITE_TRAFFIC_API_KEY', 'demo-key');
      const fetchMock = vi.fn(async (url) => {
        const isLive = String(url).includes('driving-traffic');
        if (!isLive && freeSeconds === null) return { ok: false, status: 500, json: async () => ({}) };
        return { ok: true, json: async () => ({ routes: [{ duration: isLive ? liveSeconds : freeSeconds, legs: [{ steps: [] }] }] }) };
      });
      vi.stubGlobal('fetch', fetchMock);
      return fetchMock;
    };

    test('the same long trip is normal when free-flow is just as long (the ETA alone decides nothing)', async () => {
      const fetchMock = stubMapbox(1800, 1750);
      const result = await fetchTrafficStatus(base);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.etaMinutes).toBe(30);
      expect(result.level).toBe('normal');
      expect(result.delayMinutes).toBe(1);
    });

    test('moderate and heavy come from the extra time over free-flow, and the delay is that measured difference', async () => {
      stubMapbox(900, 600); // +5 min on 10 min free-flow = 50%
      const moderate = await fetchTrafficStatus(base);
      expect(moderate.level).toBe('moderate');
      expect(moderate.delayMinutes).toBe(5);

      vi.unstubAllGlobals();
      stubMapbox(1200, 600); // +10 min on 10 min = 100%
      const heavy = await fetchTrafficStatus(base);
      expect(heavy.level).toBe('heavy');
      expect(heavy.delayMinutes).toBe(10);
    });

    test('without a free-flow baseline the level is unknown and no delay is shown', async () => {
      stubMapbox(1200, null);
      const result = await fetchTrafficStatus(base);
      expect(result.etaMinutes).toBe(20);
      expect(result.level).toBe('unknown');
      expect(result.delayMinutes).toBeNull();
    });
  });
});