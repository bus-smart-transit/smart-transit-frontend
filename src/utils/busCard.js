import { clock12 } from './clock';

// 2026-11-21 (user): the card that opens when a bus is clicked on Track Bus: the company and body number, where the bus
// is, its next stop (or when it leaves) with the minutes, and chips for the service, the bus class and its state.
// Every value comes from the live bus row and the trip timeline; a missing one is left out or says "Not provided".

const MANILA = 'Asia/Manila';

/** Minutes from now until a Manila clock time "HH:MM" today (0 once it is due); null when there is no time. */
export function minutesUntilClock(hhmm, nowMs = Date.now()) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(hhmm ?? ''));
  if (!match) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: MANILA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(nowMs)).map((part) => [part.type, part.value]));
  const now = Number(parts.hour) * 60 + Number(parts.minute);
  return Math.max(0, Number(match[1]) * 60 + Number(match[2]) - now);
}

/** "In ~n min", "Due now", or null when the minutes are not known. */
export function minutesText(minutes) {
  if (minutes == null || !Number.isFinite(Number(minutes))) return null;
  const n = Math.max(0, Math.round(Number(minutes)));
  return n === 0 ? 'Due now' : `In ~${n} min`;
}

/**
 * What the bus card shows for a live bus row.
 * @param {object} bus the row from fleet/locations
 * @param {{ eta?: object|null, place?: string|null, nowMs?: number }} options eta from busEtaSummary; place from describeBusPlace
 */
export function busCardView(bus, { eta = null, place = null, nowMs = Date.now() } = {}) {
  if (!bus) return null;
  const progress = bus.trip_progress || {};
  const service = progress.service || null;
  const chips = [];
  if (service?.label) chips.push({ key: 'service', label: service.non_stop ? `${service.label} · Non-stop` : service.label });
  if (bus.vehicle_class_label) chips.push({ key: 'class', label: bus.vehicle_class_label });
  if (String(bus.trip_status || '').toLowerCase() === 'delayed') chips.push({ key: 'delayed', label: 'Delayed', tone: 'warning' });
  if (progress.full === true) chips.push({ key: 'full', label: 'Full', tone: 'danger' });
  if (bus.is_simulated) chips.push({ key: 'simulated', label: 'Simulated', tone: 'warning' });

  let next;
  if (bus.waiting) {
    const minutes = minutesUntilClock(bus.departs_at, nowMs);
    next = {
      label: 'Leaves',
      place: bus.waiting_at || null,
      time: bus.departs_at ? (clock12(bus.departs_at) || bus.departs_at) : 'Not provided',
      minutes: minutesText(minutes),
      live: false,
    };
  } else if (eta?.finished || progress.arrived) {
    next = { label: 'Arrived', place: eta?.destination?.name || progress.destination || 'the last stop', time: null, minutes: null, live: false };
  } else if (eta?.next) {
    next = { label: 'Next stop', place: eta.next.name || 'Not provided', time: eta.next.time || null, minutes: minutesText(eta.next.minutes), live: Boolean(eta.next.live) };
  } else {
    next = { label: 'Next stop', place: progress.next_stop || 'Not provided', time: null, minutes: null, live: false };
  }

  // The bus type the Operator set (public or private), as the old map popup showed it ("Type: Public").
  const type = String(bus.fleet_type || '').trim();

  return {
    type: type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : null,
    company: bus.bus_company || null,
    bodyNo: bus.bus_body_no || null,
    title: bus.bus_company || bus.bus_label || 'Bus',
    route: bus.route_name || null,
    place: place || null,
    next,
    chips,
    routeId: Number(bus.route_id) > 0 ? Number(bus.route_id) : null,
  };
}
