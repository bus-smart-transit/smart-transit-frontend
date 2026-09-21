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
    expect(requestUrl.searchParams.get('alternatives')).toBe('true');
    expect(requestUrl.searchParams.get('instructions')).toBe('true');
    expect(fetchMock.mock.calls[0][1]?.headers?.Accept).toContain('application/geo+json');

    expect(result.level).toBe('moderate');
    expect(result.etaMinutes).toBe(11);
    expect(result.routeName).toBe('Route 7');
    expect(result.assignedRoute).toBe(true);
    expect(result.rerouteRoute).toContain('Route 7');
    expect(result.suggestion).toContain('Route 7');
    expect(result.routeGeometry).toBeTruthy();
    expect(result.routeGeometry.type).toBe('LineString');
    expect(result.alternateEtaMinutes).toBeGreaterThan(0);
    expect(result.alternateRouteGeometry).toBeTruthy();
    expect(result.alternateRouteGeometry.type).toBe('LineString');
    expect(result.timeSavedMinutes).toBeGreaterThanOrEqual(0);
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
    expect(result.routeGeometry?.type).toBe('LineString');
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
  });
});
