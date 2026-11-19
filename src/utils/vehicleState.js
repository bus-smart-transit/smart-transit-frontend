import { haversineM, nearestPointOnLine } from './geo'
import { MAP_CONFIG } from '../config/mapConfig'

/**
 * Formats an age in ms as "just now", "45s ago", "3m ago", "2h ago", "1d ago".
 */
export function formatAge(ageMs) {
  const sec = Math.floor(Math.max(0, ageMs) / 1000)
  const min = Math.floor(sec / 60)
  const hour = Math.floor(min / 60)
  const day = Math.floor(hour / 24)
  if (day > 0) return `${day}d ago`
  if (hour > 0) return `${hour}h ago`
  if (min > 0) return `${min}m ago`
  if (sec > 15) return `${sec}s ago`
  return 'just now'
}

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Turns a raw vehicle report into the one visual state the map shows.
 *
 * vehicle: { latitude, longitude, accuracy?, recordedAt?, routePosition? }
 *   routePosition is the server-computed projection
 *   ({ snapped_latitude, snapped_longitude, distance_to_route_m, on_route });
 *   when absent (driver's own device) a display-only client projection is used.
 *
 * States: no_gps | stale | weak | off_route | ok
 * Only `ok` and `off_route`/`stale` carry a marker coordinate; `weak` fixes are
 * ignored entirely, and no state ever draws a line between points.
 */
export function computeVehicleState({
  vehicle,
  routeCoords = [],
  nowMs = Date.now(),
  staleAfterSeconds = MAP_CONFIG.staleAfterSeconds,
  maxAccuracyM = MAP_CONFIG.maxAccuracyM,
  onRouteThresholdM = MAP_CONFIG.onRouteThresholdM,
} = {}) {
  const lat = toNumber(vehicle?.latitude)
  const lng = toNumber(vehicle?.longitude)
  if (lat === null || lng === null) {
    return { state: 'no_gps', label: 'No GPS fix yet', coord: null, distanceToRouteM: null }
  }

  const accuracy = toNumber(vehicle?.accuracy)
  if (accuracy !== null && accuracy > maxAccuracyM) {
    return {
      state: 'weak',
      label: `GPS signal weak (±${Math.round(accuracy)} m)`,
      coord: null,
      distanceToRouteM: null,
    }
  }

  const raw = [lng, lat]
  let coord = raw
  let distanceToRouteM = null
  const server = vehicle?.routePosition

  if (server && toNumber(server.snapped_latitude) !== null && toNumber(server.snapped_longitude) !== null) {
    coord = [Number(server.snapped_longitude), Number(server.snapped_latitude)]
    distanceToRouteM = toNumber(server.distance_to_route_m)
  } else if (routeCoords.length >= 2) {
    const snapped = nearestPointOnLine(raw, routeCoords, Infinity)
    distanceToRouteM = haversineM(lat, lng, snapped[1], snapped[0])
    coord = snapped
  }

  const onRoute = distanceToRouteM === null || distanceToRouteM <= onRouteThresholdM

  const recordedAtMs = vehicle?.recordedAt ? new Date(vehicle.recordedAt).getTime() : NaN
  if (Number.isFinite(recordedAtMs)) {
    const ageMs = Math.max(0, nowMs - recordedAtMs)
    if (ageMs > staleAfterSeconds * 1000) {
      return {
        state: 'stale',
        label: `Last seen ${formatAge(ageMs)}`,
        coord: onRoute ? coord : raw,
        distanceToRouteM,
      }
    }
  }

  if (!onRoute) {
    return {
      state: 'off_route',
      label: `Location not on route (${Math.round(distanceToRouteM)} m from route)`,
      coord: raw,
      distanceToRouteM,
    }
  }

  return { state: 'ok', label: 'Live', coord, distanceToRouteM }
}
