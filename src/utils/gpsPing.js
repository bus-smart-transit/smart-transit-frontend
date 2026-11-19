// Batch 28, Stage 2: when the driver app sends the bus position. The server treats a position older than its
// stale limit (config, 90 s by default) as "bus position unavailable". A parked or queued bus never moves 30 m, so
// moving alone would let a stationary bus go stale; a heartbeat resends the same position well inside that limit.

export const GPS_MIN_DISTANCE_M = 30
export const GPS_HEARTBEAT_MS = 45000

/** Metres between two { latitude, longitude } points (flat-earth approximation: fine at 30 m scale). */
export function approxMeters(a, b) {
  if (!a || !b) return null
  const dLat = a.latitude - b.latitude
  const dLng = a.longitude - b.longitude
  return Math.sqrt(dLat * dLat + dLng * dLng) * 111320
}

/**
 * Send when nothing has been sent yet, when the bus moved at least the minimum distance, or when the heartbeat
 * interval has passed since the last successful send (so a stationary bus keeps its position fresh).
 */
export function shouldSendPing({ movedMeters, msSinceLastSend, minDistanceM = GPS_MIN_DISTANCE_M, heartbeatMs = GPS_HEARTBEAT_MS }) {
  if (movedMeters === null || movedMeters === undefined || msSinceLastSend === null || msSinceLastSend === undefined) return true
  return movedMeters >= minDistanceM || msSinceLastSend >= heartbeatMs
}
