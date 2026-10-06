import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { OpPageHeader, OpCard, OpChip, OpStat, OpTable } from './OperatorUI';
import { OP_SPACE, TRIP_STATUS_TONE } from './operatorUiTokens';
import ViewTabs from '../../ui/ViewTabs';
import Modal from '../../ui/Modal';
import RouteMap from '../../Map/RouteMap';
import FareRulesPanel from '../FareRulesPanel';
import DropoffRulesPanel from '../DropoffRulesPanel';
import DurationFactorsPanel from '../DurationFactorsPanel';
import OperatorService from '../../../api/StaffService/OperatorService';
import { routeActivity, upcomingTripsFor, assignmentsOnRoute, sortedRouteStops, formatDuration } from '../../../utils/operatorRouteView';
import { departureLabel } from '../../../utils/operatorDashboardView';
import { formatManilaDate } from '../../../utils/dates';

const INPUT = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500';
const PRIMARY = 'inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60';
const SECONDARY = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

const ROUTE_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'stops', label: 'Stops' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'fleets', label: 'Assigned fleets' },
  { key: 'fare', label: 'Fare' },
  { key: 'dropoff', label: 'Drop-off rules' },
  { key: 'travel', label: 'Travel time' },
];

const STATUS_LABEL = { scheduled: 'Scheduled', delayed: 'Delayed', boarding: 'Boarding', departed: 'On the road', 'in-progress': 'On the road' };

function Detail({ label, children }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="font-semibold text-slate-900">{children}</dd></div>;
}

function AssignStopModal({ open, onClose, route, stops, form, setForm, saving, message, onSubmit }) {
  const taken = new Set(sortedRouteStops(route).map((row) => Number(row.stop_id)));
  const available = stops.filter((stop) => !taken.has(Number(stop.stop_id)));
  const failed = (message || '').toLowerCase().includes('failed');
  return (
    <Modal open={open} onClose={onClose} title={`Assign stop to ${route.route_name}`} fullScreenOnMobile>
      <form onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-600 sm:col-span-2">Stop
            <select value={form.stop_id} onChange={(event) => setForm((prev) => ({ ...prev, stop_id: event.target.value }))} required className={`${INPUT} mt-1`}>
              <option value="">Select stop</option>
              {available.map((stop) => <option key={stop.stop_id} value={stop.stop_id}>{stop.stop_name}{stop.municipality ? ` (${stop.municipality})` : ''}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">Stop order
            <input type="number" min="1" value={form.stop_order} onChange={(event) => setForm((prev) => ({ ...prev, stop_order: event.target.value }))} required className={`${INPUT} mt-1`} />
          </label>
        </div>
        {message && <p role={failed ? 'alert' : 'status'} className={`mt-3 rounded-lg border px-3 py-2 text-sm ${failed ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{message}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={SECONDARY}>Done</button>
          <button type="submit" disabled={saving} className={PRIMARY}>{saving ? 'Assigning...' : 'Assign stop'}</button>
        </div>
      </form>
    </Modal>
  );
}

function OverviewTab({ row, trips, routesTab, onChangeDropoff }) {
  const { route } = row;
  const activity = routeActivity(route.route_id, trips);
  return (
    <div className={OP_SPACE.stack}>
      <div className={OP_SPACE.inline}>
        <OpChip tone={row.status.tone}>{row.status.label}</OpChip>
        {row.geometryIssue && <OpChip tone="warning">Route line needs regenerating</OpChip>}
        {route.geometry_error && <span className="text-xs text-slate-500">{route.geometry_error}</span>}
      </div>
      <section aria-label="Route summary" className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <OpStat label="Stops" value={row.stopCount} />
        <OpStat label="Distance" value={row.distanceKm === null ? '-' : `${row.distanceKm} km`} hint="to the last stop" />
        <OpStat label="Travel time" value={formatDuration(row.durationMin) ?? '-'} hint="scheduled, to the last stop" />
        <OpStat label="Municipalities" value={row.municipalities.length || '-'} />
        <OpStat label="Active fleets" value={row.activeFleets.length} tone={row.activeFleets.length ? 'success' : 'neutral'} />
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <OpCard title="Route map" subtitle="The saved route line with its stops.">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <RouteMap routeId={Number(route.route_id)} direction="outbound" vehicle={null} showStatus={false} className="relative h-72 w-full" />
          </div>
        </OpCard>
        <div className={OP_SPACE.stack}>
          <OpCard title="Route activity" subtitle="Everything this route has carried so far.">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="Trips">{activity.totalTrips}</Detail>
              <Detail label="Completion rate">{activity.completionRatePct === null ? '-' : `${activity.completionRatePct}%`}</Detail>
              <Detail label="Average tickets sold per day">{activity.avgDailyTicketsSold ?? '-'}</Detail>
              <Detail label="Busiest departure hour">{activity.peakHour ? `${activity.peakHour.hour} (${activity.peakHour.trips} trips)` : '-'}</Detail>
            </dl>
          </OpCard>
          <OpCard title="Custom drop-off">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(route.allow_custom_dropoff)}
                disabled={routesTab.manageSaving}
                onChange={(event) => onChangeDropoff(event.target.checked)}
                aria-label={`Allow custom drop-off pins on ${route.route_name}`}
              />
              {route.allow_custom_dropoff ? 'On' : 'Off'}
            </label>
            <p className="mt-2 text-xs text-slate-500">Lets passengers pin a drop-off point on this route (off by default). The pin must be on the route line and ahead of where the passenger boards. Areas and points are set under Drop-off rules.</p>
          </OpCard>
        </div>
      </div>
    </div>
  );
}

function StopsTab({ route, routesTab, onOpenAssign }) {
  const stops = sortedRouteStops(route);
  const columns = [
    { key: 'order', header: '#', render: (row) => row.stop_order },
    { key: 'name', header: 'Stop', render: (row) => <span className="font-semibold text-slate-900">{row.stop?.stop_name || `Stop #${row.stop_id}`}</span> },
    { key: 'municipality', header: 'Municipality', render: (row) => row.stop?.municipality || '-' },
    { key: 'distance', header: 'From origin', className: 'whitespace-nowrap', render: (row) => (row.distance_from_origin_km === null || row.distance_from_origin_km === undefined ? '-' : `${Number(row.distance_from_origin_km)} km`) },
    { key: 'type', header: 'Type', render: (row) => (row.stop_type === 'pass_through' ? 'Pass-through' : 'Stop') },
    { key: 'express', header: 'Express', render: (row) => (row.stop_type !== 'pass_through' && row.id ? (
      <label className="inline-flex items-center gap-2 text-xs text-slate-700" title="Express trips stop here">
        <input
          type="checkbox"
          checked={Boolean(row.served_by_express)}
          disabled={routesTab.manageSaving}
          onChange={(event) => { void routesTab.handleToggleStopExpress(route.route_id, row.id, event.target.checked); }}
          aria-label={`Express trips stop at ${row.stop?.stop_name || row.stop_id}`}
        />
        {row.served_by_express ? 'Yes' : 'No'}
      </label>
    ) : <span className="text-slate-400">-</span>) },
    { key: 'remove', header: '', render: (row) => (row.id ? (
      <button type="button" disabled={routesTab.manageSaving} aria-label={`Remove ${row.stop?.stop_name || `stop ${row.stop_id}`} from route`} onClick={() => { void routesTab.handleRemoveStopFromRoute(route.route_id, row.id); }} className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50">Remove</button>
    ) : null) },
  ];
  return (
    <OpCard
      title="Stops in order"
      subtitle="The order is set when a stop is assigned."
      badge={<button type="button" onClick={onOpenAssign} className={PRIMARY}>Assign stop</button>}
    >
      <OpTable caption="Stops on this route" columns={columns} rows={stops} rowKey={(row) => row.id ?? `${row.stop_id}-${row.stop_order}`} empty="No stops on this route yet. Use Assign stop to add the first one." />
    </OpCard>
  );
}

function ScheduleTab({ row, fleets, trips, onOpenSchedule }) {
  const windows = assignmentsOnRoute(row.routeId, fleets);
  const upcoming = upcomingTripsFor(row.routeId, trips);
  return (
    <div className={OP_SPACE.stack}>
      <OpCard title="Service windows" subtitle="The hours each fleet is assigned to run this route.">
        <OpTable
          caption="Service windows"
          rows={windows}
          rowKey={(item) => item.key}
          empty="No fleet is assigned to this route."
          columns={[
            { key: 'plate', header: 'Fleet', render: (item) => item.fleet.plate_number },
            { key: 'window', header: 'Runs', render: (item) => (item.start && item.end ? `${item.start} - ${item.end}` : '-') },
            { key: 'status', header: 'Assignment', render: (item) => <OpChip tone={item.active ? 'success' : 'neutral'}>{item.active ? 'Active' : 'Inactive'}</OpChip> },
          ]}
        />
      </OpCard>
      <OpCard
        title="Trips still to run"
        subtitle="Today and later, from the trips already scheduled."
        badge={<button type="button" onClick={onOpenSchedule} className={SECONDARY}>Open Schedule</button>}
      >
        <OpTable
          caption="Upcoming trips on this route"
          rows={upcoming}
          rowKey={(trip) => trip.trip_id}
          empty="No trips are scheduled on this route."
          columns={[
            { key: 'date', header: 'Date', className: 'whitespace-nowrap', render: (trip) => formatManilaDate(String(trip.trip_date).slice(0, 10)) },
            { key: 'time', header: 'Departure', render: (trip) => departureLabel(trip) },
            { key: 'fleet', header: 'Fleet', render: (trip) => trip.fleet_route?.fleet?.plate_number || '-' },
            { key: 'status', header: 'Status', render: (trip) => <OpChip tone={TRIP_STATUS_TONE[trip.status] ?? 'neutral'}>{STATUS_LABEL[trip.status] ?? trip.status}</OpChip> },
          ]}
        />
      </OpCard>
    </div>
  );
}

function FleetsTab({ row, fleets, onOpenFleets }) {
  const assignments = assignmentsOnRoute(row.routeId, fleets);
  return (
    <OpCard
      title="Assigned fleets"
      subtitle="Buses that are set up to run this route."
      badge={<button type="button" onClick={onOpenFleets} className={SECONDARY}>Open Fleets</button>}
    >
      <OpTable
        caption="Fleets assigned to this route"
        rows={assignments}
        rowKey={(item) => item.key}
        empty="No fleet is assigned yet. Assign this route to a fleet from the Fleets page."
        columns={[
          { key: 'plate', header: 'Fleet', render: (item) => <strong className="text-slate-900">{item.fleet.plate_number}</strong> },
          { key: 'type', header: 'Type', render: (item) => item.fleet.fleet_type || 'public' },
          { key: 'capacity', header: 'Capacity', render: (item) => item.fleet.capacity ?? '-' },
          { key: 'window', header: 'Runs', render: (item) => (item.start && item.end ? `${item.start} - ${item.end}` : '-') },
          { key: 'status', header: 'Status', render: (item) => <OpChip tone={item.active ? 'success' : 'neutral'}>{item.active ? 'Active' : 'Inactive'}</OpChip> },
        ]}
      />
    </OpCard>
  );
}

function TravelTimeTab({ route }) {
  const stops = sortedRouteStops(route);
  return (
    <div className={OP_SPACE.stack}>
      <OpCard title="Scheduled minutes from the origin" subtitle="Per stop, as saved on the route. Express minutes apply to express trips.">
        <OpTable
          caption="Scheduled travel time by stop"
          rows={stops}
          rowKey={(row) => row.id ?? `${row.stop_id}-${row.stop_order}`}
          empty="No stops on this route yet."
          columns={[
            { key: 'order', header: '#', render: (row) => row.stop_order },
            { key: 'name', header: 'Stop', render: (row) => row.stop?.stop_name || `Stop #${row.stop_id}` },
            { key: 'regular', header: 'Regular', render: (row) => (row.scheduled_offset_min === null || row.scheduled_offset_min === undefined ? '-' : `${row.scheduled_offset_min} min`) },
            { key: 'express', header: 'Express', render: (row) => (row.served_by_express && row.express_offset_min !== null && row.express_offset_min !== undefined ? `${row.express_offset_min} min` : '-') },
          ]}
        />
      </OpCard>
      <DurationFactorsPanel service={OperatorService} routes={[route]} tone="light" />
    </div>
  );
}

/**
 * Batch 31 Phase 4: one route. Every tab shows data that already exists; there is no stop reordering (the backend has
 * no endpoint for it) and no route status field beyond "has an active fleet".
 */
export default function RouteDetailPage({
  row, routes, fleets, stops, trips, routesTab, onBack, onRefresh, onOpenSchedule, onOpenFleets,
}) {
  const [tab, setTab] = useState('overview');
  const [assignOpen, setAssignOpen] = useState(false);
  const { route } = row;

  const openAssign = () => {
    const nextOrder = String(Math.max(0, ...sortedRouteStops(route).map((item) => Number(item.stop_order) || 0)) + 1);
    routesTab.clearManageMsg();
    routesTab.setRouteStopForm({ route_id: String(route.route_id), stop_id: '', stop_order: nextOrder });
    setAssignOpen(true);
  };

  return (
    <div className={OP_SPACE.stack}>
      <OpPageHeader
        title={route.route_name}
        subtitle={`${route.origin || '-'} to ${route.destination || '-'}`}
        action={<button type="button" onClick={onBack} className={SECONDARY}><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> All routes</button>}
      />

      {routesTab.manageMsg && !assignOpen && (
        <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${routesTab.manageMsg.toLowerCase().includes('failed') ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{routesTab.manageMsg}</p>
      )}

      <ViewTabs label="Route sections" tabs={ROUTE_TABS} value={tab} onChange={setTab} />

      <div role="tabpanel" aria-label={ROUTE_TABS.find((item) => item.key === tab)?.label}>
        {tab === 'overview' && <OverviewTab row={row} trips={trips} routesTab={routesTab} onChangeDropoff={(allow) => { void routesTab.handleToggleCustomDropoff(route.route_id, allow); }} />}
        {tab === 'stops' && <StopsTab route={route} routesTab={routesTab} onOpenAssign={openAssign} />}
        {tab === 'schedule' && <ScheduleTab row={row} fleets={fleets} trips={trips} onOpenSchedule={onOpenSchedule} />}
        {tab === 'fleets' && <FleetsTab row={row} fleets={fleets} onOpenFleets={onOpenFleets} />}
        {tab === 'fare' && (
          <OpCard>
            <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Fares are set per vehicle class and service type. A rule either covers every route or one route, so use the Route filter to see only the rules written for {route.route_name}.
            </p>
            <FareRulesPanel service={OperatorService} fleets={fleets} routes={routes} canCreateGeneral={false} tone="light" />
          </OpCard>
        )}
        {tab === 'dropoff' && <DropoffRulesPanel service={OperatorService} routes={[route]} tone="light" onRoutesChanged={onRefresh} />}
        {tab === 'travel' && <TravelTimeTab route={route} />}
      </div>

      <AssignStopModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        route={route}
        stops={stops}
        form={routesTab.routeStopForm}
        setForm={routesTab.setRouteStopForm}
        saving={routesTab.manageSaving}
        message={routesTab.manageMsg}
        onSubmit={routesTab.handleAddStopToRoute}
      />
    </div>
  );
}
