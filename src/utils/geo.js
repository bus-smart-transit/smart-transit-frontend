import { OFFICIAL_STOPS } from "../data/stops.js";

// Beyond this distance from every SmartTransit stop we don't guess a city:
// the passenger is outside the service area and picks one by hand.
export const SERVICE_AREA_KM = 25;

// Straight-line ("as the crow flies") distance in km between two points.
export function distanceKm(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatKm(km) {
  if (km < 1) return `${Math.max(0.1, Math.round(km * 10) / 10)} km`;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

// Stops sorted nearest-first from a point, each with its distance.
export function stopsByDistance(point, { terminalsOnly = false } = {}) {
  return OFFICIAL_STOPS.filter((stop) => !terminalsOnly || stop.isTerminal)
    .map((stop) => ({ ...stop, distanceKm: distanceKm(point, stop) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

// Approximate city/municipality for a point: the municipality of the nearest
// SmartTransit stop, if that stop is within the service area. Runs entirely
// in the browser, so the passenger's coordinates are never sent anywhere.
export function detectMunicipality(point) {
  const [nearest] = stopsByDistance(point);
  if (!nearest || nearest.distanceKm > SERVICE_AREA_KM) return null;
  return { municipality: nearest.municipality, province: nearest.province };
}

// Municipalities that have at least one SmartTransit stop, for manual choice.
export const MUNICIPALITIES = [...new Set(OFFICIAL_STOPS.map((stop) => stop.municipality))]
  .sort()
  .map((municipality) => {
    const stops = OFFICIAL_STOPS.filter((stop) => stop.municipality === municipality);
    return {
      municipality,
      province: stops[0].province,
      // Centre of the municipality's stops, used to rank terminals when the
      // passenger picks a place instead of sharing their location.
      center: {
        lat: stops.reduce((sum, s) => sum + s.lat, 0) / stops.length,
        lng: stops.reduce((sum, s) => sum + s.lng, 0) / stops.length,
      },
    };
  });

export const findMunicipality = (name) => MUNICIPALITIES.find((m) => m.municipality === name) ?? null;
