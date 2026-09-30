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
    .map((stop) => ({
      stopId: Number(stop.stop_id),
      name: stop.stop_name || '',
      sequence: Number(stop.stop_order),
      type: stop.stop_type || 'stop',
      distanceKm: Number(stop.distance_from_origin_km),
      // Prefer the road-snapped coordinate the server computed for routing.
      latitude: Number(stop.snapped_latitude ?? stop.latitude),
      longitude: Number(stop.snapped_longitude ?? stop.longitude),
    }))
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
