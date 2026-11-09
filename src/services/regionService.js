import api from './api.js'

// The service region is defined once, on the
// server (config/region.php), and read here. Nothing in the frontend carries a
// region name, centre or bounding box of its own.

let cached = null

/** Server payload -> { name, center: [lng, lat], bounds: {minLng,maxLng,minLat,maxLat}, provinces }, or null if unusable. */
export function normalizeRegion(payload) {
  const bbox = payload?.bbox
  const nums = bbox ? [bbox.min_lat, bbox.max_lat, bbox.min_lng, bbox.max_lng].map(Number) : []
  if (nums.length !== 4 || !nums.every(Number.isFinite)) return null

  const center = [Number(payload?.center?.lng), Number(payload?.center?.lat)]

  return {
    name: String(payload?.name || ''),
    center: center.every(Number.isFinite) ? center : null,
    bounds: { minLat: nums[0], maxLat: nums[1], minLng: nums[2], maxLng: nums[3] },
    provinces: payload?.provinces && typeof payload.provinces === 'object' ? payload.provinces : {},
    // Batch 45 Feature C: the "Buses near you" radius in km (config/tracking.php); null when the server gives none.
    nearbyRadiusKm: Number(payload?.nearby_radius_km) > 0 ? Number(payload.nearby_radius_km) : null,
  }
}

/** [[minLng, minLat], [maxLng, maxLat]] as MapLibre `bounds` / `fitBounds` expect. */
export function regionMapBounds(region) {
  const b = region.bounds
  return [[b.minLng, b.minLat], [b.maxLng, b.maxLat]]
}

/** Cached fetch of GET /region; a failed load is not cached so it can be retried. */
export function getRegion() {
  if (!cached) {
    cached = api.get('/region')
      .then((res) => {
        const region = normalizeRegion(res?.data?.data)
        if (!region) throw new Error('Region configuration is missing or invalid.')
        return region
      })
      .catch((error) => {
        cached = null
        throw error
      })
  }
  return cached
}

export function clearRegionCache() {
  cached = null
}

/**
 * Batch 51 item 3 (user, 2026-11-09): the region town a point is in, for "Are you in {place}?" on the homepage.
 * The point is rounded to 2 decimals (about 1 km) before it leaves the device. Resolves to { place, province } or null.
 */
export async function getRegionPlace(lat, lng) {
  const res = await api.get('/region/place', { params: { lat: Number(lat).toFixed(2), lng: Number(lng).toFixed(2) } })
  return res?.data?.data ?? null
}
