import { clock12 } from './clock';

// 2026-11-21 (user, Dynamic Route Scheduling): a bus has its operating hours, and its route is chosen for each trip.
// These shape the bus list of the scheduling form from the server's availability answer (GET operator/fleets/
// availability): free buses first, the others shown with why they cannot take the trip.

/** "6:00 AM to 10:00 PM", or "Not set" when the bus has no hours. */
export function operatingHoursText(fleet) {
  const start = String(fleet?.operating_start_time ?? '').slice(0, 5);
  const end = String(fleet?.operating_end_time ?? '').slice(0, 5);
  if (!start || !end) return 'Not set';
  return `${clock12(start) || start} to ${clock12(end) || end}`;
}

const SHORT_REASON = {
  outside_hours: (bus) => `outside its hours (${operatingHoursText(bus)})`,
  busy: () => 'on another trip then',
  no_fare: () => 'no fare for this route',
};

/** The bus's option text: its plate and label, and why it is not free. */
export function busOptionLabel(bus) {
  const name = [bus?.plate_number, bus?.bus_label].filter(Boolean).join(' · ') || `Bus #${bus?.fleet_id}`;
  if (bus?.available !== false) return name;
  const why = SHORT_REASON[bus?.reason_code]?.(bus) || 'not free';
  return `${name} - ${why}`;
}

/** Free buses first, then the rest; plate order inside each. */
export function sortBusesForPicker(buses = []) {
  return [...(Array.isArray(buses) ? buses : [])].sort((a, b) => {
    if ((a?.available !== false) !== (b?.available !== false)) return a?.available !== false ? -1 : 1;
    return String(a?.plate_number ?? '').localeCompare(String(b?.plate_number ?? ''));
  });
}

/** The time the bus list is checked for: the trip's departure, or a multi-leg schedule's first leg. */
export function availabilityTime(form) {
  if (form?.trip_type === 'round_trip') {
    const legs = Array.isArray(form?.leg_departure_times) ? form.leg_departure_times : [];
    return legs[0] || '';
  }
  return form?.departure_time || '';
}
