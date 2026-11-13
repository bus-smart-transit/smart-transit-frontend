// Batch 65 (user, 2026-11-13): Available trips shows one card per journey instead of one per departure; the passenger
// chooses the time on the trip details page (its "Departure time" choice). Departures are grouped only when everything
// that changes the fare or the stops is the same: the date, where they board and get off, the route, the bus type
// (Aircon, Ordinary) and the service (Regular, Express). The server's list order is kept.

const part = (value) => String(value ?? '').trim().toLowerCase();

/** The group a departure belongs to. */
export function tripGroupKey(trip) {
  return [
    part(trip?.trip_date),
    part(trip?.origin?.stop_code ?? trip?.origin?.stop_id),
    part(trip?.destination?.stop_code ?? trip?.destination?.stop_id),
    part(trip?.route_name),
    part(trip?.vehicle_class),
    part(trip?.service_type ?? trip?.service?.type),
  ].join('|');
}

/** True when two departures are the same journey on the same kind of bus (so one fare and one set of stops). */
export const sameTripGroup = (a, b) => tripGroupKey(a) === tripGroupKey(b);

const timeOf = (trip) => String(trip?.boarding_time ?? '');

/**
 * The departures as groups: { key, lead, trips, otherTimes }. `lead` is the earliest departure that can still be
 * booked (else the earliest), shown on the card; `otherTimes` are the rest of the group's times, earliest first.
 */
export function groupTrips(trips) {
  const groups = new Map();
  for (const trip of Array.isArray(trips) ? trips : []) {
    const key = tripGroupKey(trip);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(trip);
  }
  return [...groups.entries()].map(([key, list]) => {
    const sorted = [...list].sort((a, b) => timeOf(a).localeCompare(timeOf(b)));
    const lead = sorted.find((trip) => trip.bookable !== false) ?? sorted[0];
    return { key, lead, trips: sorted, otherTimes: sorted.filter((trip) => trip !== lead).map(timeOf).filter(Boolean) };
  });
}
