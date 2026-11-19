// Batch 58 (user, 2026-11-10): what screens do with a live update. Pure, so it is tested without a connection.

/** Where a bus.moved update puts the bus: on the route line when the server placed it there, else where it reported. */
export function livePositionLngLat(update) {
  const projected = update?.route_position?.on_route ? update.route_position : null
  const lat = Number(projected ? projected.snapped_latitude : update?.latitude)
  const lng = Number(projected ? projected.snapped_longitude : update?.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : null
}

/** How often a screen polls: slower while live updates arrive (polling is then only a safety net). */
export function pollEvery(normalMs, liveConnected, liveMs = 60000) {
  return liveConnected ? Math.max(normalMs, liveMs) : normalMs
}

/** True when a trip.status update is about a trip on this screen. */
export function concernsTrips(update, trips = []) {
  const id = Number(update?.trip_id)
  return Number.isFinite(id) && trips.some((trip) => Number(trip?.trip_id) === id)
}
