/**
 * 2026-11-06 (Batch 47 part A): small helpers for a stop's map pin and how a stop is shown.
 */

/** 6 decimals is about 10 cm: enough for a stop, and short to read. */
export function roundCoord(value) {
  return Math.round(Number(value) * 1e6) / 1e6;
}

/** { latitude, longitude } as numbers, or null when either is missing or not a valid coordinate. */
export function parsePin(latitude, longitude) {
  if (latitude === '' || longitude === '' || latitude === null || longitude === null || latitude === undefined || longitude === undefined) {
    return null;
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }
  return { latitude: lat, longitude: lng };
}

/** "Acacia (Downtown / Poblacion)", or just the name when there is no label. */
export function stopDisplayName(stop) {
  const name = String(stop?.stop_name ?? '').trim();
  const label = String(stop?.location_label ?? '').trim();
  return label ? `${name} (${label})` : name;
}

/** A stop placed on the map by a person, or one whose place was guessed from its name (needs a re-pin). */
export function isPinned(stop) {
  return stop?.location_source !== 'name';
}
