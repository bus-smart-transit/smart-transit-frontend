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

/**
 * Projects a [lng, lat] point onto the nearest point of a polyline (array
 * of [lng, lat] vertices), using a simple planar approximation — accurate
 * enough at city scale, matching the precision level already used
 * elsewhere in this file.
 *
 * Batch 13, Issue #2: route lines are often drawn from OSRM's road-snapped
 * geometry, which can legitimately deviate from a stop's raw recorded
 * coordinate (e.g. a pin dropped slightly off the road centerline). Placing
 * stop markers at the raw coordinate then makes them look like they've
 * "drifted" off the drawn path. Snapping the marker onto the nearest point
 * of the drawn line keeps it visually anchored to the path.
 *
 * `maxSnapDistanceM` guards against snapping a genuinely distant/unrelated
 * stop onto the wrong part of a looping route — if the nearest point on the
 * line is farther than this from the raw coordinate, the raw coordinate is
 * returned unchanged instead.
 */
export function nearestPointOnLine(point, line, maxSnapDistanceM = 400) {
  if (!Array.isArray(point) || point.length < 2) return point;
  if (!Array.isArray(line) || line.length < 2) return point;

  const [px, py] = point;
  let best = null;
  let bestDistSq = Infinity;

  for (let i = 0; i < line.length - 1; i += 1) {
    const [ax, ay] = line[i];
    const [bx, by] = line[i + 1];
    const abx = bx - ax;
    const aby = by - ay;
    const lenSq = abx * abx + aby * aby;
    let t = lenSq > 0 ? ((px - ax) * abx + (py - ay) * aby) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * abx;
    const cy = ay + t * aby;
    const dx = px - cx;
    const dy = py - cy;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = [cx, cy];
    }
  }

  if (!best) return point;

  const snapDistanceM = haversineM(py, px, best[1], best[0]);
  return snapDistanceM <= maxSnapDistanceM ? best : point;
}
