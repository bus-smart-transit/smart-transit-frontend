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
});
