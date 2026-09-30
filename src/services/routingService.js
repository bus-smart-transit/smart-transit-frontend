// Shared external-API wrappers for the passenger "calculate my route" UI and
// landmark geocoding. Bus route lines are NOT routed here: they come from the
// canonical server-side geometry (see routeMapService.js).

import { getRegion } from './regionService';
import { toViewbox } from '../utils/routeGeometry';

/**
 * Driving route with distance/duration, needed by the passenger "calculate
 * my route" UI (MapView.web.jsx), which displays those metrics alongside the
 * drawn path. Returns null on failure.
 */
export async function fetchDrivingRouteWithMetrics(coordinates = []) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const encoded = coordinates.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${encoded}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const route = data?.routes?.[0];
    if (!route?.geometry) return null;

    return {
      geometry: route.geometry,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch {
    return null;
  }
}

/**
 * Geocodes a free-text landmark/place name to coordinates via the public
 * Nominatim (OpenStreetMap) search API, scoped to `bounds` (the loaded route's
 * bounds when the caller has them, otherwise the configured service region).
 * Returns null if nothing is found or the request fails.
 */
export async function geocodeLandmark(query, bounds) {
  if (!query || !query.trim()) return null;

  const searchBounds = bounds || (await getRegion().catch(() => null))?.bounds;
  if (!searchBounds) return null;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${toViewbox(searchBounds)}&bounded=1&limit=1`;

  try {
    const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const [result] = data;
    return {
      lng: parseFloat(result.lon),
      lat: parseFloat(result.lat),
      name: result.display_name.split(',')[0],
    };
  } catch {
    return null;
  }
}
