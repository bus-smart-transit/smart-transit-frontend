/**
 * Haversine distance between two GPS coordinates, in metres.
 * Single shared implementation — used by MapView and DriverDashboard.
 */
export function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Linear interpolation, t clamped to [0, 1]. */
export function lerp(a, b, t) {
  const ct = Math.max(0, Math.min(1, t));
  return a + (b - a) * ct;
}

/**
 * Shortest-path angle interpolation — handles 359° → 1° correctly.
 * t clamped to [0, 1].
 */
export function lerpAngle(a, b, t) {
  if (a == null || b == null) return b ?? 0;
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return ((a + diff * Math.max(0, Math.min(1, t))) + 360) % 360;
}
