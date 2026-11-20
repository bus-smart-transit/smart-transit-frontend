/**
 * 2026-11-20 (user: two buses waiting at the same terminal, the newer one covered the other): buses drawn at the same
 * spot (within about 11 m) are set side by side by a pixel offset, so each can be seen and tapped at any zoom. Their
 * position on the map is not changed. Returns a Map from each point's id to its [x, y] offset in pixels.
 */
export const MARKER_SPACING_PX = 30;

export function markerOffsets(points, spacing = MARKER_SPACING_PX) {
  const groups = new Map();
  for (const point of Array.isArray(points) ? points : []) {
    if (point?.lat == null || point?.lng == null) continue; // Number(null) would read as 0
    const lat = Number(point.lat);
    const lng = Number(point.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(point.id);
  }
  const offsets = new Map();
  for (const ids of groups.values()) {
    const start = -((ids.length - 1) * spacing) / 2;
    ids.forEach((id, index) => offsets.set(id, [ids.length > 1 ? start + index * spacing : 0, 0]));
  }
  return offsets;
}
