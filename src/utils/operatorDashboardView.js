import { getBusinessToday } from './dates';
import { computeVehicleState, formatAge } from './vehicleState';

/**
 * Batch 31: everything the reworked Operator Dashboard shows, computed from data the backend already returns (trips,
 * fleets, fleet locations). Nothing here is simulated: a figure the data cannot support is not produced.
 *
 * "The system recommends. The operator decides." These rules only SUGGEST; the one write the Operator can make
 * from the dashboard is recording a decision (PATCH trips/{id}/dispatch-decision), which dispatches or reroutes nothing.
 */

export const LIVE_STATUSES = ['boarding', 'departed', 'in-progress'];
export const OPEN_STATUSES = ['scheduled', 'delayed', 'boarding', 'departed', 'in-progress'];
// A trip whose sold tickets reach this share of the bus's capacity is called "near full". It is a display rule,
// not a prediction.
export const HIGH_LOAD_PCT = 85;

const statusOf = (trip) => String(trip?.status || '').toLowerCase();
export const routeNameOf = (trip) => trip?.fleet_route?.route?.route_name || 'Unassigned route';
export const routeIdOf = (trip) => {
  const id = Number(trip?.fleet_route?.route_id ?? trip?.fleet_route?.route?.route_id);
  return Number.isFinite(id) && id > 0 ? id : null;
};
export const fleetIdOf = (trip) => {
  const id = Number(trip?.fleet_route?.fleet_id ?? trip?.fleet_route?.fleet?.fleet_id);
  return Number.isFinite(id) && id > 0 ? id : null;
};
export const plateOf = (trip) => trip?.fleet_route?.fleet?.plate_number || 'Fleet pending';

/** Tickets sold for the trip: the trip's own counters (the same definition the sale block uses). */
export function ticketsSold(trip) {
  const total = Number(trip?.total_occupancy);
  if (Number.isFinite(total)) return total;
  return Number(trip?.current_seated_capacity ?? 0) + Number(trip?.current_standing_capacity ?? 0);
}

export function capacityOf(trip) {
  const fleet = trip?.fleet_route?.fleet;
  const total = Number(fleet?.capacity);
  if (Number.isFinite(total) && total > 0) return total;
  const sum = Number(fleet?.seated_capacity ?? 0) + Number(fleet?.standing_capacity ?? 0);
  return sum > 0 ? sum : 0;
}

export function loadPct(trip) {
  const capacity = capacityOf(trip);
  return capacity > 0 ? Math.round((ticketsSold(trip) / capacity) * 100) : null;
}

export const departureLabel = (trip) => String(trip?.departure_time || trip?.fleet_route?.start_time || '').slice(0, 5) || '--:--';

const hasDriver = (trip) => Boolean(trip?.driver || trip?.driver_id);
const hasConductor = (trip) => Boolean(trip?.conductor || trip?.conductor_id);

/** The fleet's last reported position for this trip (matched by trip, then by fleet). */
export function locationForTrip(trip, locations = []) {
  const tripId = Number(trip?.trip_id);
  const fleetId = fleetIdOf(trip);
  return locations.find((row) => Number(row?.trip_id) === tripId && tripId > 0)
    || locations.find((row) => fleetId && Number(row?.fleet_id) === fleetId)
    || null;
}

/** none | live | stale | weak | off_route, with the label the map would show. */
export function gpsStatus(location, nowMs = Date.now()) {
  if (!location) return { state: 'none', label: 'No GPS fix yet' };
  const result = computeVehicleState({
    vehicle: {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy_m,
      recordedAt: location.recorded_at || location.updated_at,
      routePosition: location.route_position,
    },
    nowMs,
  });
  return { state: result.state === 'no_gps' ? 'none' : result.state === 'ok' ? 'live' : result.state, label: result.label };
}

export function tripsToday(trips = [], today = getBusinessToday()) {
  return trips
    .filter((trip) => String(trip?.trip_date || '').slice(0, 10) === today)
    .sort((a, b) => departureLabel(a).localeCompare(departureLabel(b)) || Number(a.trip_id) - Number(b.trip_id));
}

const DECISION_LABEL = { accept: 'Advice acknowledged', keep: 'Kept current route' };
export const decisionLabel = (decision) => DECISION_LABEL[decision] ?? null;

function alertsFor(todays, locations, nowMs) {
  const alerts = [];
  for (const trip of todays) {
    const status = statusOf(trip);
    const where = `${routeNameOf(trip)} - ${plateOf(trip)} - ${departureLabel(trip)}`;
    if (status === 'delayed') {
      alerts.push({ key: `${trip.trip_id}-delayed`, kind: 'delayed', tone: 'danger', route: routeNameOf(trip), tripId: trip.trip_id, title: `Trip #${trip.trip_id} is delayed`, detail: where, action: 'Contact the crew and keep passengers informed.' });
    }
    if (['scheduled', 'delayed', 'boarding'].includes(status) && (!hasDriver(trip) || !hasConductor(trip))) {
      const missing = !hasDriver(trip) && !hasConductor(trip) ? 'a driver and a conductor' : !hasDriver(trip) ? 'a driver' : 'a conductor';
      alerts.push({ key: `${trip.trip_id}-crew`, kind: 'crew', tone: 'warning', route: routeNameOf(trip), tripId: trip.trip_id, title: `Trip #${trip.trip_id} still needs ${missing}`, detail: where, action: 'Assign the missing crew in Schedule before departure.' });
    }
    if (['departed', 'in-progress'].includes(status)) {
      const gps = gpsStatus(locationForTrip(trip, locations), nowMs);
      if (gps.state === 'none' || gps.state === 'stale' || gps.state === 'weak') {
        alerts.push({ key: `${trip.trip_id}-gps`, kind: 'gps', tone: 'warning', route: routeNameOf(trip), tripId: trip.trip_id, title: `Trip #${trip.trip_id}: ${gps.label}`, detail: where, action: 'Ask the driver to check the phone\'s location and data connection.' });
      }
    }
    const pct = loadPct(trip);
    if (OPEN_STATUSES.includes(status) && pct !== null && pct >= HIGH_LOAD_PCT) {
      alerts.push({ key: `${trip.trip_id}-load`, kind: 'load', tone: 'info', route: routeNameOf(trip), tripId: trip.trip_id, title: `Trip #${trip.trip_id} is near full`, detail: `${ticketsSold(trip)} of ${capacityOf(trip)} tickets sold - ${where}`, action: 'Consider an extra trip on this route.' });
    }
  }
  return alerts;
}

function adviceFor(todays, locations, nowMs) {
  const byRoute = new Map();
  for (const trip of todays) {
    const status = statusOf(trip);
    if (!OPEN_STATUSES.includes(status)) continue;
    const entry = byRoute.get(routeNameOf(trip)) ?? { route: routeNameOf(trip), routeId: routeIdOf(trip), delayed: [], offRoute: [] };
    if (status === 'delayed') entry.delayed.push(trip);
    if (LIVE_STATUSES.includes(status) && gpsStatus(locationForTrip(trip, locations), nowMs).state === 'off_route') entry.offRoute.push(trip);
    byRoute.set(entry.route, entry);
  }
  return [...byRoute.values()]
    .filter((entry) => entry.delayed.length > 0 || entry.offRoute.length > 0)
    .map((entry) => {
      const reasons = [];
      if (entry.delayed.length) reasons.push(`${entry.delayed.length} delayed trip${entry.delayed.length > 1 ? 's' : ''}`);
      if (entry.offRoute.length) reasons.push(`${entry.offRoute.length} bus${entry.offRoute.length > 1 ? 'es' : ''} reporting a position away from the route`);
      const trip = entry.offRoute[0] ?? entry.delayed[0];
      return {
        key: `advice-${entry.route}`,
        route: entry.route,
        routeId: entry.routeId,
        tripId: trip.trip_id,
        priority: entry.offRoute.length > 0 || entry.delayed.length > 1 ? 'high' : 'medium',
        reasons,
        text: `${entry.route}: ${reasons.join(' and ')}. No alternate route is on file, so whether to hold, reassign or keep the current route is your decision.`,
        decision: trip.dispatch_decision || null,
        decisionLabel: decisionLabel(trip.dispatch_decision),
        decidedAt: trip.dispatch_decided_at || null,
      };
    })
    .sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'high' ? -1 : 1));
}

function deploymentFor(todays, fleets, loadByRoute, delayedRoutes) {
  const busyFleetIds = new Set(todays.filter((trip) => statusOf(trip) !== 'cancelled').map(fleetIdOf).filter(Boolean));
  const idle = fleets.filter((fleet) => String(fleet?.status || 'active').toLowerCase() === 'active' && !busyFleetIds.has(Number(fleet.fleet_id)));
  const pressure = loadByRoute.filter((row) => row.pct >= HIGH_LOAD_PCT || delayedRoutes.has(row.route));
  const items = [];
  for (const row of pressure) {
    const candidates = idle.filter((fleet) => (fleet.fleet_routes || []).some((link) => Number(link.route_id) === Number(row.routeId) && String(link.status || 'active') === 'active'));
    if (candidates.length) {
      items.push({ key: `deploy-${row.route}`, tone: 'info', route: row.route, text: `${candidates.map((fleet) => fleet.plate_number).join(', ')} ${candidates.length > 1 ? 'have' : 'has'} no trip today and ${candidates.length > 1 ? 'are' : 'is'} assigned to ${row.route}. You could schedule an extra trip.` });
    } else {
      items.push({ key: `deploy-${row.route}`, tone: 'warning', route: row.route, text: `${row.route} is under pressure and no idle fleet is assigned to it. Assign a fleet to the route or schedule one from Fleets.` });
    }
  }
  if (!items.length && idle.length) {
    items.push({ key: 'deploy-idle', tone: 'neutral', route: null, text: `${idle.length} fleet${idle.length > 1 ? 's have' : ' has'} no trip today: ${idle.map((fleet) => fleet.plate_number).join(', ')}.` });
  }
  return items;
}

export function buildDashboardView({ trips = [], fleets = [], locations = [], today = getBusinessToday(), nowMs = Date.now() } = {}) {
  const todays = tripsToday(trips, today);
  const counted = todays.filter((trip) => statusOf(trip) !== 'cancelled');

  const liveTrips = todays.filter((trip) => LIVE_STATUSES.includes(statusOf(trip)));
  const kpis = {
    activeBuses: new Set(liveTrips.map(fleetIdOf).filter(Boolean)).size,
    totalFleets: fleets.length,
    activeTrips: liveTrips.length,
    delayedTrips: todays.filter((trip) => statusOf(trip) === 'delayed').length,
    ticketsSold: counted.reduce((sum, trip) => sum + ticketsSold(trip), 0),
    tripsToday: todays.length,
  };

  const statusCount = (status) => todays.filter((trip) => statusOf(trip) === status).length;
  const statusBreakdown = [
    { key: 'scheduled', label: 'Scheduled', value: statusCount('scheduled'), tone: 'neutral' },
    { key: 'boarding', label: 'Boarding', value: statusCount('boarding'), tone: 'info' },
    { key: 'live', label: 'On the road', value: statusCount('departed') + statusCount('in-progress'), tone: 'warning' },
    { key: 'delayed', label: 'Delayed', value: statusCount('delayed'), tone: 'danger' },
    { key: 'completed', label: 'Completed', value: statusCount('completed'), tone: 'success' },
    { key: 'cancelled', label: 'Cancelled', value: statusCount('cancelled'), tone: 'neutral' },
  ];

  const routes = new Map();
  for (const trip of counted) {
    const name = routeNameOf(trip);
    const row = routes.get(name) ?? { route: name, routeId: routeIdOf(trip), trips: 0, sold: 0, capacity: 0 };
    row.trips += 1;
    row.sold += ticketsSold(trip);
    row.capacity += capacityOf(trip);
    routes.set(name, row);
  }
  const loadByRoute = [...routes.values()]
    .map((row) => ({ ...row, pct: row.capacity > 0 ? Math.round((row.sold / row.capacity) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct || a.route.localeCompare(b.route));

  const hours = new Map();
  for (const trip of counted) {
    const label = `${departureLabel(trip).slice(0, 2)}:00`;
    if (label.includes('-')) continue;
    hours.set(label, (hours.get(label) ?? 0) + ticketsSold(trip));
  }
  const soldByHour = [...hours.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([hour, sold]) => ({ hour, sold }));

  // Route Delay Overview: the schedule's own verdict (the server marks a trip "delayed" once its departure time has
  // passed without departing) plus whether the live buses are reporting.
  const delay = new Map();
  for (const trip of todays) {
    const name = routeNameOf(trip);
    const row = delay.get(name) ?? { route: name, scheduled: 0, live: 0, delayed: 0, completed: 0, noGps: 0 };
    const status = statusOf(trip);
    if (status === 'scheduled') row.scheduled += 1;
    if (LIVE_STATUSES.includes(status)) row.live += 1;
    if (status === 'delayed') row.delayed += 1;
    if (status === 'completed') row.completed += 1;
    if (['departed', 'in-progress'].includes(status) && gpsStatus(locationForTrip(trip, locations), nowMs).state !== 'live') row.noGps += 1;
    delay.set(name, row);
  }
  const delayByRoute = [...delay.values()]
    .filter((row) => row.scheduled + row.live + row.delayed + row.completed > 0)
    .map((row) => ({ ...row, status: row.delayed > 0 ? 'Delayed' : 'On schedule' }))
    .sort((a, b) => b.delayed - a.delayed || a.route.localeCompare(b.route));

  const alerts = alertsFor(todays, locations, nowMs);

  // Recommended actions: one line per (route, kind), so three late trips on one route is one action.
  const seen = new Set();
  const actions = [];
  for (const alert of alerts) {
    const id = `${alert.route}|${alert.kind}`;
    if (seen.has(id)) continue;
    seen.add(id);
    actions.push({ key: id, route: alert.route, priority: alert.tone === 'danger' ? 'high' : alert.tone === 'warning' ? 'medium' : 'low', text: alert.action });
  }

  const advice = adviceFor(todays, locations, nowMs);
  const delayedRoutes = new Set(delayByRoute.filter((row) => row.delayed > 0).map((row) => row.route));
  const deployment = deploymentFor(todays, fleets, loadByRoute, delayedRoutes);

  const decisions = todays
    .filter((trip) => trip.dispatch_decision)
    .map((trip) => ({
      key: `decision-${trip.trip_id}`,
      tripId: trip.trip_id,
      route: routeNameOf(trip),
      label: decisionLabel(trip.dispatch_decision) ?? trip.dispatch_decision,
      reason: trip.dispatch_reason || '',
      decidedAt: trip.dispatch_decided_at || null,
    }));

  return { todays, kpis, statusBreakdown, loadByRoute, soldByHour, delayByRoute, alerts, actions, advice, deployment, decisions };
}

/** "Last seen 3m ago" for a fleet row; null when nothing was ever reported. */
export function lastSeenLabel(location, nowMs = Date.now()) {
  const at = location?.recorded_at || location?.updated_at;
  const ms = at ? new Date(at).getTime() : NaN;
  return Number.isFinite(ms) ? formatAge(nowMs - ms) : null;
}
