/** Bounds of [lng, lat] points, padded by `padDeg`; null when there are none. */
export function boundsFromPoints(points, padDeg = 0) {
  const valid = (points || []).filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
  if (valid.length === 0) return null
  const lngs = valid.map((p) => p[0])
  const lats = valid.map((p) => p[1])
  return {
    minLng: Math.min(...lngs) - padDeg,
    maxLng: Math.max(...lngs) + padDeg,
    minLat: Math.min(...lats) - padDeg,
    maxLat: Math.max(...lats) + padDeg,
  }
}

/** Nominatim `viewbox` value: left,top,right,bottom. */
export function toViewbox(bounds) {
  return `${bounds.minLng},${bounds.maxLat},${bounds.maxLng},${bounds.minLat}`
}

const toFiniteNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Validates a GeoJSON LineString ([lng, lat] coordinates) received from the
 * server and drops malformed points. Returns null when fewer than two usable
 * points remain.
 */
export function normalizeLineStringGeometry(geometry) {
  if (!geometry || geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)) {
    return null
  }

  const coords = geometry.coordinates
    .map((coord) => {
      if (!Array.isArray(coord) || coord.length < 2) return null
      const lng = toFiniteNumber(coord[0])
      const lat = toFiniteNumber(coord[1])
      if (lng == null || lat == null) return null
      return [lng, lat]
    })
    .filter(Boolean)

  if (coords.length < 2) return null

  return {
    type: 'LineString',
    coordinates: coords,
  }
}
