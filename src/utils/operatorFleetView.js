import { getBusinessToday } from './dates';
import {
  LIVE_STATUSES, tripsToday, fleetIdOf, routeNameOf, departureLabel, gpsStatus, ticketsSold, capacityOf, locationForTrip, lastSeenLabel,
} from './operatorDashboardView';

/**
 * Batch 31 Phase 3: what the Operator's Fleets page shows for each bus.
 *
 * The database stores only `fleets.status` (in practice "active"); there is no maintenance state and none is
 * invented. The four states below are DERIVED from today's trips and the bus's last GPS report:
 *
 *   on_route  a trip is boarding or on the road AND the bus is reporting a fresh position
 *   offline   a trip is boarding or on the road but there is no fresh position (none, stale, or too weak)
 *   active    in service today: it has a trip still to run, none under way yet
 *   idle      no trip left to run today
 *
 * A fleet whose stored status is not "active" is shown as "inactive" and is never derived into the above.
 */

export const FLEET_STATUS = {
  on_route: { label: 'On route', tone: 'success' },
  offline: { label: 'Offline', tone: 'warning' },
  active: { label: 'Active', tone: 'info' },
  idle: { label: 'Idle', tone: 'neutral' },
  inactive: { label: 'Inactive', tone: 'danger' },
};

export const FLEET_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'on_route', label: 'On route' },
  { value: 'active', label: 'Active' },
  { value: 'idle', label: 'Idle' },
  { value: 'offline', label: 'Offline' },
];

const OPEN_LATER = ['scheduled', 'delayed'];

export function fleetLocation(fleetId, locations = []) {
  return locations.find((row) => Number(row?.fleet_id) === Number(fleetId)) || null;
}

export function buildFleetRows({ fleets = [], trips = [], locations = [], today = getBusinessToday(), nowMs = Date.now() } = {}) {
  const todays = tripsToday(trips, today);
  return fleets.map((fleet) => {
    const mine = todays.filter((trip) => fleetIdOf(trip) === Number(fleet.fleet_id));
    const live = mine.find((trip) => LIVE_STATUSES.includes(String(trip.status).toLowerCase())) || null;
    const later = mine.filter((trip) => OPEN_LATER.includes(String(trip.status).toLowerCase()));
    const location = live ? locationForTrip(live, locations) : fleetLocation(fleet.fleet_id, locations);
    const gps = gpsStatus(location, nowMs);

    let key;
    if (String(fleet.status || 'active').toLowerCase() !== 'active') key = 'inactive';
    else if (live) key = gps.state === 'live' || gps.state === 'off_route' ? 'on_route' : 'offline';
    else if (later.length > 0) key = 'active';
    else key = 'idle';

    const next = live || later[0] || null;
    return {
      fleet,
      fleetId: Number(fleet.fleet_id),
      status: { key, ...FLEET_STATUS[key] },
      liveTrip: live,
      trackable: Boolean(live),
      nextTrip: next,
      nextTripLabel: next ? `${routeNameOf(next)} - ${departureLabel(next)}` : null,
      tripsToday: mine.length,
      location,
      gps,
      lastSeen: lastSeenLabel(location, nowMs),
      routes: (fleet.fleet_routes || []).map((link) => link?.route?.route_name).filter(Boolean),
      ticketsSold: live ? ticketsSold(live) : null,
      capacity: live ? capacityOf(live) : Number(fleet.capacity) || null,
    };
  });
}

export function filterFleetRows(rows, filter) {
  return filter === 'all' ? rows : rows.filter((row) => row.status.key === filter);
}
