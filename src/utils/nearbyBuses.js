// Batch 45 Feature C (decided 2026-11-04): the "Buses near you" panel on the public map. Pure helpers, unit-tested.
// The passenger's location never leaves the device: distances are measured here from the public bus list.

import { haversineM } from './geo';

/** Metres between two { lat, lng } points, or null when either is missing (uses the shared haversineM). */
export function distanceMeters(a, b) {
  const values = [a?.lat, a?.lng, b?.lat, b?.lng];
  if (values.some((v) => v === null || v === undefined || v === '')) return null;
  const [lat1, lng1, lat2, lng2] = values.map(Number);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;
  return haversineM(lat1, lng1, lat2, lng2);
}

/** The buses within radiusKm of the passenger, nearest first, each with `_distanceM`. Empty without a location. */
export function busesNear(fleets, userCoords, radiusKm) {
  if (!userCoords || !(Number(radiusKm) > 0)) return [];
  return (fleets || [])
    .map((row) => ({ ...row, _distanceM: distanceMeters(userCoords, { lat: row?.latitude, lng: row?.longitude }) }))
    .filter((row) => row._distanceM !== null && row._distanceM <= Number(radiusKm) * 1000)
    .sort((a, b) => a._distanceM - b._distanceM);
}

/**
 * What a bus card says about arrival at its next stop (from `trip_progress`):
 *   time      'HH:MM' or null ("Not provided")
 *   basis     'Live estimate' | 'Scheduled' | null
 *   scheduled 'Scheduled HH:MM' shown apart when the live time differs, else null
 *   delay     '5 min late' | '2 min early' | 'On time' | null
 *   note      why it fell back to the schedule, or null
 */
export function busArrival(progress) {
  if (!progress || !progress.eta_time) {
    return { time: null, basis: null, scheduled: null, delay: null, note: null };
  }
  const live = progress.eta_basis === 'live';
  const delayMin = Number.isFinite(Number(progress.delay_minutes)) && progress.delay_minutes !== null ? Math.round(Number(progress.delay_minutes)) : null;
  let delay = null;
  if (live && delayMin !== null) {
    if (delayMin > 0) delay = `${delayMin} min late`;
    else if (delayMin < 0) delay = `${-delayMin} min early`;
    else delay = 'On time';
  }
  return {
    time: progress.eta_time,
    basis: live ? 'Live estimate' : 'Scheduled',
    scheduled: live && progress.scheduled_time && progress.scheduled_time !== progress.eta_time ? `Scheduled ${progress.scheduled_time}` : null,
    delay,
    note: !live && progress.gps_stale && !progress.arrived ? 'Bus location is old, so this is the scheduled time.' : null,
  };
}

/**
 * Batch 50 (user, 2026-11-08): what an Active buses card says about the trip as a whole, from `trip_progress`:
 *   departedAt 'HH:MM' or null; destination the last stop's name or null; arrives { time, basis } for the destination
 *   (live from the bus position when known, else the timetable) or null; arrived true once the bus is at its last stop.
 */
export function busTrip(progress) {
  if (!progress) return { departedAt: null, destination: null, arrives: null, arrived: false };
  const arrived = progress.arrived === true;
  return {
    departedAt: progress.departed_at || null,
    destination: progress.destination || null,
    arrives: !arrived && progress.destination_eta_time
      ? { time: progress.destination_eta_time, basis: progress.destination_eta_basis === 'live' ? 'Live estimate' : 'Scheduled' }
      : null,
    arrived,
  };
}

/** Batch 50: "in about 12 min" / "now" for a live ETA (an ISO time), or '' when unknown. */
export function minutesUntil(iso, nowMs = Date.now()) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return '';
  const minutes = Math.max(0, Math.round((t - nowMs) / 60000));
  return minutes === 0 ? 'now' : `in about ${minutes} min`;
}

/** "Passengers" on a card: the count on board now, or "Not provided" when unknown (never zero by default). */
export function passengersText(progress) {
  const n = progress?.passengers;
  return Number.isInteger(n) && n >= 0 ? String(n) : 'Not provided';
}

export function formatKm(meters) {
  if (meters === null || meters === undefined || !Number.isFinite(Number(meters))) return '';
  return Number(meters) < 1000 ? `${Math.round(Number(meters))} m away` : `${(Number(meters) / 1000).toFixed(1)} km away`;
}
