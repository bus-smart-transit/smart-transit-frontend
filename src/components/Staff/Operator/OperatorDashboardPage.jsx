import { useMemo, useState } from 'react';
import { RefreshCw, Bus, Route as RouteIcon, AlertTriangle, Ticket, CalendarClock } from 'lucide-react';
import { OpPageHeader, OpCard, OpChip, OpStat, OpBar, OpStackedBar, OpTable, OpEmpty } from './OperatorUI';
import { OP_SPACE, TRIP_STATUS_TONE } from './operatorUiTokens';
import RunInfoChips from '../../ui/RunInfoChips';
import CalendarSummaryStrip from '../CalendarSummaryStrip';
import DashboardCalendar from '../DashboardCalendar';
import OperatorService from '../../../api/StaffService/OperatorService';
import { useFleetLocations, useDispatchAdvice, useRouteAdherence, useNow } from '../../../api/hooks/Staff/useOperatorDashboardExtras';
import {
  buildDashboardView, capacityOf, ticketsSold, loadPct, departureLabel, routeNameOf, plateOf,
  locationForTrip, gpsStatus, decisionPayload, HIGH_LOAD_PCT,
} from '../../../utils/operatorDashboardView';
import RerouteAdviceItem from './RerouteAdviceItem';
import { getBusinessTodayLabel, formatManilaDateTime } from '../../../utils/dates';

const STATUS_LABEL = {
  scheduled: 'Scheduled', delayed: 'Delayed', boarding: 'Boarding', departed: 'On the road', 'in-progress': 'On the road', completed: 'Completed', cancelled: 'Cancelled',
};
const GPS_CHIP = {
  live: ['success', 'GPS live'], stale: ['warning', 'GPS out of date'], weak: ['warning', 'GPS signal weak'], off_route: ['warning', 'Off route'], none: ['neutral', 'No GPS'],
};
const PRIORITY_TONE = { high: 'danger', medium: 'warning', low: 'info' };

const personName = (person) => person?.user?.name || person?.name || person?.user?.username || person?.username || null;

function TodaysTrips({ trips, locations, nowMs }) {
  const columns = [
    { key: 'time', header: 'Time', render: (trip) => departureLabel(trip), className: 'whitespace-nowrap font-mono text-xs' },
    { key: 'route', header: 'Route', className: 'whitespace-nowrap', render: (trip) => routeNameOf(trip) },
    { key: 'fleet', header: 'Fleet', render: (trip) => <span className="whitespace-nowrap">{plateOf(trip)} <RunInfoChips runPattern={trip.run_info?.run_pattern} service={trip.run_info?.service} serviceType={trip.service_type} showRunPattern /></span> },
    { key: 'crew', header: 'Crew', render: (trip) => (
      <span className="whitespace-nowrap text-xs">
        {personName(trip.driver) ?? <em className="text-amber-700">No driver</em>}
        <br />
        {personName(trip.conductor) ?? <em className="text-amber-700">No chauffeur</em>}
      </span>
    ) },
    { key: 'status', header: 'Status', render: (trip) => <OpChip tone={TRIP_STATUS_TONE[trip.status] ?? 'neutral'}>{STATUS_LABEL[trip.status] ?? trip.status}</OpChip> },
    { key: 'gps', header: 'GPS', render: (trip) => {
      if (!['departed', 'in-progress'].includes(trip.status)) return <span className="text-slate-400">-</span>;
      const gps = gpsStatus(locationForTrip(trip, locations), nowMs);
      const [tone, label] = GPS_CHIP[gps.state] ?? GPS_CHIP.none;
      return <OpChip tone={tone}>{label}</OpChip>;
    } },
    { key: 'sold', header: 'Tickets sold', className: 'whitespace-nowrap', render: (trip) => {
      const pct = loadPct(trip);
      return `${ticketsSold(trip)} / ${capacityOf(trip) || '-'}${pct === null ? '' : ` (${pct}%)`}`;
    } },
  ];
  return <OpTable caption="Today's trips" columns={columns} rows={trips} rowKey={(trip) => trip.trip_id} empty="No trips are scheduled for today." />;
}

function AlertsCard({ alerts }) {
  return (
    <OpCard title="Alerts" subtitle="From today's trips, crew assignments and GPS reports" badge={<OpChip tone={alerts.length ? 'warning' : 'success'}>{alerts.length ? `${alerts.length} open` : 'All clear'}</OpChip>}>
      {alerts.length === 0 ? <OpEmpty>No alerts. Today&apos;s trips are running without delays, crew gaps or GPS problems.</OpEmpty> : (
        <ul className="max-h-96 space-y-3 overflow-y-auto">
          {alerts.map((alert) => (
            <li key={alert.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${alert.tone === 'danger' ? 'text-rose-600' : alert.tone === 'warning' ? 'text-amber-600' : 'text-sky-600'}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                  <p className="text-xs text-slate-500">{alert.detail}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </OpCard>
  );
}

function RouteAdherenceCard({ fleets }) {
  const { loading, rows, error } = useRouteAdherence(fleets);
  const withData = rows.filter((row) => row.ok && row.tripsWithGps > 0);
  const failed = rows.filter((row) => !row.ok);
  const total = withData.reduce((sum, row) => sum + row.tripsWithGps, 0);
  const deviated = withData.reduce((sum, row) => sum + row.deviated, 0);
  const overall = total > 0 ? Math.round(((total - deviated) / total) * 100) : null;
  return (
    <OpCard
      title="Route adherence"
      subtitle="Last 7 days, from recorded GPS positions. Trips with no GPS history are not counted."
      badge={overall === null ? null : <OpChip tone={overall >= 90 ? 'success' : 'warning'}>{overall}% overall</OpChip>}
    >
      {loading ? <p className="text-sm text-slate-500">Loading GPS history...</p>
        : error ? <OpEmpty>The adherence report could not be loaded right now.</OpEmpty>
          : withData.length === 0 && failed.length === 0 ? <OpEmpty>No GPS history for the last 7 days yet, so adherence cannot be calculated.</OpEmpty> : (
            <>
              {withData.length > 0 && (
                <OpTable
                  caption="Route adherence by fleet"
                  rows={withData}
                  rowKey={(row) => row.fleetId}
                  columns={[
                    { key: 'plate', header: 'Fleet' },
                    { key: 'tripsWithGps', header: 'Trips with GPS' },
                    { key: 'deviated', header: 'Off-route trips' },
                    { key: 'ratePct', header: 'Adherence', render: (row) => (row.ratePct === null ? '-' : `${row.ratePct}%`) },
                  ]}
                />
              )}
              {failed.length > 0 && (
                <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  The adherence report could not be loaded for {failed.map((row) => row.plate).join(', ')}, so it is not included.
                </p>
              )}
            </>
          )}
    </OpCard>
  );
}

const DECISION_LABEL = { accept: 'Advice acknowledged', keep: 'Kept current route', contact: 'Crew contacted' };
const NOTIFICATION_LABEL = {
  in_app_and_push: 'In-app notification and push sent',
  partial_push: 'In-app notification sent; push reached some crew',
  in_app_only: 'In-app notification sent; push unavailable',
  no_assigned_crew: 'No assigned crew to notify',
  not_requested: 'No notification requested',
  not_recorded: 'Outcome not recorded',
};

function DispatchDecisionBoard({ advice, history, historyLoading, historyError, saving, error, onDecide, onHistoryFiltersChange }) {
  const open = advice.filter((item) => !item.decision).length;
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const normalizedSearch = search.trim().toLowerCase();
  const filteredHistory = history.filter((item) => {
    const text = `${item.route} ${item.trip_id} ${item.actor} ${item.decision} ${item.note}`.toLowerCase();
    return !normalizedSearch || text.includes(normalizedSearch);
  });
  return (
    <OpCard
      title="Dispatch decision board"
      subtitle="The system recommends. The operator decides. Bus assignments and routes are never changed automatically."
      badge={<OpChip tone={open ? 'warning' : 'success'}>{open ? `${open} awaiting decision` : 'No open advice'}</OpChip>}
    >
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Operational advice</h3>
      {advice.length === 0 ? <OpEmpty>No route needs review right now.</OpEmpty> : (
        <ul className="space-y-3">
          {advice.map((item) => <RerouteAdviceItem key={item.key} item={item} saving={saving} onDecide={onDecide} />)}
        </ul>
      )}
      {error && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

      <div className="mb-2 mt-6 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Decision history</h3>
        <span className="text-xs text-slate-500">Read only · latest 100 · last 7 days by default</span>
      </div>
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <label className="text-xs font-medium text-slate-600">From
          <input type="date" value={startDate} onChange={(event) => {
            const value = event.target.value;
            setStartDate(value);
            onHistoryFiltersChange({ start_date: value || undefined, end_date: endDate || undefined });
          }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-medium text-slate-600">To
          <input type="date" value={endDate} onChange={(event) => {
            const value = event.target.value;
            setEndDate(value);
            onHistoryFiltersChange({ start_date: startDate || undefined, end_date: value || undefined });
          }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-medium text-slate-600">Search route, trip, operator
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search decisions" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
        </label>
      </div>
      {historyError && <p role="alert" className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{historyError}</p>}
      {historyLoading ? <p className="text-sm text-slate-500">Loading decision history...</p>
        : filteredHistory.length === 0 ? <p className="text-sm text-slate-500">No matching dispatch decisions in this period.</p> : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {filteredHistory.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{item.route} · Trip #{item.trip_id}</span>
                  <OpChip tone={item.decision === 'contact' ? 'info' : item.decision === 'keep' ? 'neutral' : 'success'}>{DECISION_LABEL[item.decision] ?? item.decision}</OpChip>
                </div>
                <p className="mt-1 text-xs text-slate-500">By {item.actor} · {formatManilaDateTime(item.created_at)}</p>
                {item.reason && <p className="mt-2 text-xs text-slate-600">Trigger: {item.reason}</p>}
                {item.note && <p className="mt-1 text-xs text-slate-700">Note: {item.note}</p>}
                <p className="mt-2 text-xs font-medium text-slate-600">Notification: {NOTIFICATION_LABEL[item.notification_outcome] ?? item.notification_outcome}</p>
                {item.recipient_roles?.length > 0 && <p className="mt-1 text-xs text-slate-600">Recipients: {item.recipient_roles.map((role) => role === 'conductor' ? 'Chauffeur' : 'Driver').join(', ')}</p>}
              </li>
            ))}
          </ul>
        )}
    </OpCard>
  );
}

/**
 * Batch 31 Phase 2: the Operator Dashboard. Every figure is computed from today's trips, the fleet list and the fleets'
 * last GPS positions (utils/operatorDashboardView.js). There is no revenue here (it lives in Finance), no trend arrows,
 * and no map: those either have no real data behind them or belong to other pages.
 */
export default function OperatorDashboardPage({ trips, fleets, topSlot = null, onRefresh, onOpenCalendar, onOpenSchedule }) {
  const nowMs = useNow();
  const { locations, refresh: refreshLocations } = useFleetLocations();
  const { savingTripId, error, decide, history, historyLoading, historyError, setHistoryFilters } = useDispatchAdvice({ onSaved: onRefresh });
  const view = useMemo(() => buildDashboardView({ trips, fleets, locations, nowMs }), [trips, fleets, locations, nowMs]);
  const { kpis } = view;

  const handleDecide = (item, decision, note) => decide(item.tripId, decision, decisionPayload(item, decision, note));

  return (
    <div className={OP_SPACE.stack}>
      <OpPageHeader
        title="Dashboard"
        subtitle={getBusinessTodayLabel()}
        action={(
          <button
            type="button"
            onClick={() => { onRefresh(); void refreshLocations(); }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
          </button>
        )}
      />

      {topSlot}

      <section aria-label="Today at a glance" className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <OpStat icon={Bus} label="Active buses" value={kpis.activeBuses} hint={`of ${kpis.totalFleets} fleet${kpis.totalFleets === 1 ? '' : 's'}`} tone={kpis.activeBuses ? 'success' : 'neutral'} />
        <OpStat icon={RouteIcon} label="Active trips" value={kpis.activeTrips} hint="boarding or on the road" tone="info" />
        <OpStat icon={AlertTriangle} label="Delayed trips" value={kpis.delayedTrips} hint={kpis.delayedTrips ? 'past departure time' : 'none today'} tone={kpis.delayedTrips ? 'danger' : 'success'} />
        <OpStat icon={Ticket} label="Tickets sold" value={kpis.ticketsSold} hint="today, cancelled trips excluded" />
        <OpStat icon={CalendarClock} label="Trips today" value={kpis.tripsToday} hint="all statuses" />
      </section>

      <OpCard title="Today's trips" subtitle="Scheduled, live and finished trips for the business day">
        <TodaysTrips trips={view.todays} locations={locations} nowMs={nowMs} />
      </OpCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <AlertsCard alerts={view.alerts} />
        <OpCard title="Recommended actions" subtitle="Suggestions only. Nothing here runs by itself.">
          {view.actions.length === 0 ? <OpEmpty>No action is needed right now.</OpEmpty> : (
            <ul className="max-h-96 space-y-3 overflow-y-auto">
              {view.actions.map((action) => (
                <li key={action.key} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <OpChip tone={PRIORITY_TONE[action.priority]} className="shrink-0">{action.priority}</OpChip>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{action.route}</p>
                    <p className="text-sm text-slate-600">{action.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </OpCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OpCard title="Tickets sold against capacity" subtitle={`By route, today. This counts tickets sold, not people on board. ${HIGH_LOAD_PCT}% or more is called near full.`}>
          {view.loadByRoute.length === 0 ? <OpEmpty>No tickets or trips to measure today.</OpEmpty> : (
            <div className="space-y-4">
              {view.loadByRoute.map((row) => (
                <OpBar key={row.route} label={row.route} value={row.sold} max={row.capacity} valueLabel={`${row.sold} of ${row.capacity} (${row.pct}%)`} tone={row.pct >= HIGH_LOAD_PCT ? 'warning' : 'info'} />
              ))}
            </div>
          )}
        </OpCard>
        <OpCard title="Trips today by status" subtitle="Tickets sold by scheduled departure hour is shown below.">
          <OpStackedBar segments={view.statusBreakdown} />
          <div className="mt-6 space-y-3">
            {view.soldByHour.length === 0 ? <p className="text-sm text-slate-500">No tickets sold for today&apos;s trips yet.</p> : view.soldByHour.map((row) => (
              <OpBar key={row.hour} label={row.hour} value={row.sold} max={Math.max(...view.soldByHour.map((r) => r.sold))} valueLabel={`${row.sold} ticket${row.sold === 1 ? '' : 's'}`} tone="info" />
            ))}
          </div>
        </OpCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OpCard title="Route delay overview" subtitle="From today's schedule: a trip is delayed when its departure time has passed without departing.">
          <OpTable
            caption="Route delay overview"
            rows={view.delayByRoute}
            rowKey={(row) => row.route}
            empty="No trips on any route today."
            columns={[
              { key: 'route', header: 'Route' },
              { key: 'scheduled', header: 'Scheduled' },
              { key: 'live', header: 'Live' },
              { key: 'delayed', header: 'Delayed' },
              { key: 'status', header: 'Status', render: (row) => <OpChip tone={row.delayed ? 'danger' : 'success'}>{row.status}</OpChip> },
            ]}
          />
        </OpCard>
        <RouteAdherenceCard fleets={fleets} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DispatchDecisionBoard advice={view.advice} history={history} historyLoading={historyLoading} historyError={historyError} saving={savingTripId} error={error} onDecide={handleDecide} onHistoryFiltersChange={setHistoryFilters} />
        <OpCard
          title="Suggested bus assignments"
          subtitle="Idle fleets matched against routes under pressure (delays or near-full trips)."
          badge={<button type="button" onClick={onOpenSchedule} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Open Schedule</button>}
        >
          {view.deployment.length === 0 ? <OpEmpty>Every fleet has a trip today and no route is under pressure.</OpEmpty> : (
            <ul className="space-y-3">
              {view.deployment.map((item) => (
                <li key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{item.text}</li>
              ))}
            </ul>
          )}
        </OpCard>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <DashboardCalendar service={OperatorService} onOpenFull={onOpenCalendar} />
        <CalendarSummaryStrip service={OperatorService} refreshKey={trips} stacked className="content-start" />
      </div>
      {/* 2026-10-27: the roster counts moved to the top of the Staffs page (StaffRoster). */}
    </div>
  );
}
