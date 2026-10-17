import api from './api.js'
import { normalizeLineStringGeometry } from '../utils/routeGeometry'
import { MAP_CONFIG } from '../config/mapConfig'

// Single fetch path for everything the shared route map draws. Geometry is the
// canonical line generated once on the server (never routed per viewer), and
// stops arrive already ordered for the requested leg direction (B1).

const cache = new Map()

const cacheKey = (routeId, direction) => `${routeId}:${direction}`

export function clearRouteMapCache() {
  cache.clear()
}

export async function fetchRouteMapData(routeId, direction = 'outbound') {
  const dir = direction === 'reverse' ? 'reverse' : 'outbound'
  const key = cacheKey(routeId, dir)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < MAP_CONFIG.routeCacheTtlMs) return hit.value

  const [geometryRes, stopsRes] = await Promise.all([
    api.get(`/routes/${routeId}/geometry`, { params: { direction: dir } }),
    api.get(`/routes/${routeId}/stops`, { params: { direction: dir } }),
  ])

  const geometryPayload = geometryRes?.data?.data || {}
  const stops = (Array.isArray(stopsRes?.data?.data) ? stopsRes.data.data : [])
    .map((stop) => {
      const sourceLatitude = stop.latitude == null ? null : Number(stop.latitude)
      const sourceLongitude = stop.longitude == null ? null : Number(stop.longitude)
      const snappedLatitude = stop.snapped_latitude == null ? null : Number(stop.snapped_latitude)
      const snappedLongitude = stop.snapped_longitude == null ? null : Number(stop.snapped_longitude)

      return {
        stopId: Number(stop.stop_id),
        name: stop.stop_name || '',
        sequence: Number(stop.stop_order),
        type: stop.stop_type || 'stop',
        distanceKm: Number(stop.distance_from_origin_km),
        // Other maps keep the same snapped marker they have always used.
        latitude: snappedLatitude ?? sourceLatitude,
        longitude: snappedLongitude ?? sourceLongitude,
        sourceLatitude,
        sourceLongitude,
        distanceToLineM: stop.distance_to_line_m == null ? null : Number(stop.distance_to_line_m),
      }
    })
    .filter((stop) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude))

  const value = {
    routeId: Number(routeId),
    direction: dir,
    geometry: normalizeLineStringGeometry(geometryPayload.geometry),
    geometryStale: Boolean(geometryPayload.geometry_stale),
    geometryError: geometryPayload.geometry_error || null,
    stops,
  }

  cache.set(key, { at: Date.now(), value })
  return value
}
