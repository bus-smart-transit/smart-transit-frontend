// Shared external-API wrappers for road-path routing and landmark geocoding.
//
// Architecture audit follow-up (CONF-06): this logic was previously copy-pasted
// verbatim in 3 places (MapView.web.jsx, PublicTrackingSection.jsx,
// DriverNavigationMap.jsx) with no shared error handling — a bug fix in one
// needed manual propagation to the other two. Centralized here, following the
// same `src/services/*.js` pattern already used by trafficService.js for
// external (non-backend) API calls.

/**
 * Snaps a sequence of [lng, lat] coordinate pairs onto real road geometry
 * using the public OSRM routing API. Returns null if the request fails or
 * the response doesn't contain a usable route (fail-soft — callers should
 * fall back to the straight-line coordinates on null).
 */
export async function fetchRoadPathFromOsrm(coordinates = []) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const encoded = coordinates.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${encoded}?overview=full&geometries=geojson&steps=false`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const roadCoords = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(roadCoords) || roadCoords.length < 2) return null;

    return roadCoords;
  } catch {
    return null;
  }
}

/**
 * Like fetchRoadPathFromOsrm(), but also returns distance/duration —
 * needed by the passenger "calculate my route" UI (MapView.web.jsx), which
 * displays those metrics alongside the drawn path. Returns null on failure.
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

// Bounding box roughly covering the Davao-Tagum corridor — keeps landmark
// search results relevant to this system's service area.
const DAVAO_TAGUM_VIEWBOX = '125.50,7.40,125.90,7.00';

/**
 * Geocodes a free-text landmark/place name to coordinates via the public
 * Nominatim (OpenStreetMap) search API, scoped to the Davao-Tagum area.
 * Returns null if nothing is found or the request fails.
 */
export async function geocodeLandmark(query) {
  if (!query || !query.trim()) return null;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${DAVAO_TAGUM_VIEWBOX}&bounded=1&limit=1`;

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
