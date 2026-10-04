// Batch 28 Stage 3, item 10: client-side FEEDBACK for custom drop-off restrictions. The server is the only judge: it
// re-checks every pin and point when the timeline is built and again at checkout, and its answer always wins. This
// only lets the screen say "not here" at once, before a request is made.
//
// Everything here works on data the server sent (the route line for the leg and the restricted areas as distances
// along that leg). No place name, coordinate or distance is built in.

const EARTH_RADIUS_M = 6371008.8;

export function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Nearest point of a polyline ([lng, lat] pairs, in the leg's own direction) to a pin: the distance along the line and
 * the distance from it, in metres. Same method as the server's snapping.
 */
export function projectOntoLine(coords, lat, lng) {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  let best = null;
  let travelled = 0;

  for (let i = 0; i < coords.length - 1; i += 1) {
    const [ax, ay] = coords[i];
    const [bx, by] = coords[i + 1];
    const segLen = haversineMeters(ay, ax, by, bx);
    const abx = (bx - ax) * cosLat;
    const aby = by - ay;
    const apx = (lng - ax) * cosLat;
    const apy = lat - ay;
    const lenSq = abx * abx + aby * aby;
    const t = lenSq > 0 ? Math.max(0, Math.min(1, (apx * abx + apy * aby) / lenSq)) : 0;
    const cx = ax + t * (bx - ax);
    const cy = ay + t * (by - ay);
    const distance = haversineMeters(lat, lng, cy, cx);
    if (best === null || distance < best.distanceToLineM) {
      best = { distanceToLineM: distance, alongM: travelled + t * segLen };
    }
    travelled += segLen;
  }
  return best;
}

/** The restricted area a distance along the leg falls in, or null. Areas are { name, from_m, to_m } in the leg's frame. */
export function areaAt(areas, alongM) {
  if (!Array.isArray(areas) || !Number.isFinite(alongM)) return null;
  return areas.find((area) => alongM >= Number(area.from_m) && alongM <= Number(area.to_m)) ?? null;
}

/** The wording the server uses for the same refusal, so a client and a server answer read the same. */
export function insideAreaMessage(area) {
  return `Custom drop-off is not available inside ${area.name}. Please choose an official stop.`;
}

/**
 * Feedback for a dropped pin: null when nothing is wrong here, otherwise the message to show above the Confirm button.
 * Only the checks the client can make with what it has: inside a restricted area, and behind the boarding point.
 */
export function pinFeedback({ pin, lineCoords, areas, boardingAlongM = null }) {
  if (!pin || !Number.isFinite(Number(pin.lat)) || !Number.isFinite(Number(pin.lng))) return null;
  const projected = projectOntoLine(lineCoords, Number(pin.lat), Number(pin.lng));
  if (!projected) return null;

  const area = areaAt(areas, projected.alongM);
  if (area) return insideAreaMessage(area);
  if (Number.isFinite(boardingAlongM) && projected.alongM < boardingAlongM) {
    return 'That point is behind where you board for this trip\'s direction. Choose a point further along the route.';
  }
  return null;
}

/** "Landmark", "Barangay", "Intersection": the kind as it is shown next to a point's name. */
export function pointKindLabel(kind) {
  if (!kind) return '';
  const text = String(kind);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The three route modes, as the staff screen words them. */
export const DROPOFF_MODE_LABELS = {
  off: 'Off (official stops only)',
  designated_points: 'Listed points only',
  free_pin: 'Pin anywhere on the route',
};

export const DROPOFF_MODES = Object.keys(DROPOFF_MODE_LABELS);

/** [lat, lng] pairs from the server -> GeoJSON [lng, lat] for a map line. */
export function areaToGeoJson(area) {
  const coordinates = (area.path || []).map(([lat, lng]) => [lng, lat]);
  return {
    type: 'Feature',
    properties: { id: area.id, name: area.name },
    geometry: { type: 'LineString', coordinates },
  };
}
