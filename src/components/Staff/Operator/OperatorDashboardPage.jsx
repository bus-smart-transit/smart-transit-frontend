import { useMemo } from 'react';
import {
  RefreshCw, Bus, Route as RouteIcon, AlertTriangle, Ticket, CalendarClock, CalendarDays, ListChecks, BellRing,
  Lightbulb, Gauge, PieChart, Timer, Navigation, Scale, Shuffle, CheckCircle2, Inbox, MapPinOff, ChevronRight,
} from 'lucide-react';
import { OpPageHeader, OpCard, OpChip, OpStat, OpBar, OpStackedBar, OpTable, OpEmpty } from './OperatorUI';
import { TRIP_STATUS_TONE } from './operatorUiTokens';
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
import { getBusinessTodayLabel } from '../../../utils/dates';

const STATUS_LABEL = {
  scheduled: 'Scheduled', delayed: 'Delayed', boarding: 'Boarding', departed: 'On the road', 'in-progress': 'On the road', completed: 'Completed', cancelled: 'Cancelled',
};
const GPS_CHIP = {
  live: ['success', 'GPS live'], stale: ['warning', 'GPS out of date'], weak: ['warning', 'GPS signal weak'], off_route: ['warning', 'Off route'], none: ['neutral', 'No GPS'],
};
const PRIORITY_TONE = { high: 'danger', medium: 'warning', low: 'info' };
const ALERT_STYLE = {
  danger: 'border-rose-200 bg-rose-50/60 text-rose-600',
  warning: 'border-amber-200 bg-amber-50/60 text-amber-600',
  info: 'border-sky-200 bg-sky-50/60 text-sky-600',
};

const personName = (person) => person?.user?.name || person?.name || person?.user?.username || person?.username || null;

const greetingFor = (nowMs) => {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hourCycle: 'h23' }).format(new Date(nowMs)));
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

function TodaysTrips({ trips, locations, nowMs }) {
  const columns = [
    { key: 'time', header: 'Time', render: (trip) => departureLabel(trip), className: 'whitespace-nowrap font-mono text-xs font-semibold text-slate-900' },
    { key: 'route', header: 'Route', className: 'whitespace-nowrap font-medium text-slate-900', render: (trip) => routeNameOf(trip) },
    { key: 'fleet', header: 'Fleet', render: (trip) => <span className="whitespace-nowrap">{plateOf(trip)} <RunInfoChips runPattern={trip.run_info?.run_pattern} service={trip.run_info?.service} serviceType={trip.service_type} showRunPattern /></span> },
    { key: 'crew', header: 'Crew', render: (trip) => (
      <span className="whitespace-nowrap text-xs leading-relaxed">
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
    { key: 'sold', header: 'Tickets sold', className: 'whitespace-nowrap tabular-nums', render: (trip) => {
      const pct = loadPct(trip);
      return `${ticketsSold(trip)} / ${capacityOf(trip) || '-'}${pct === null ? '' : ` (${pct}%)`}`;
    } },
  ];
  return <OpTable caption="Today's trips" columns={columns} rows={trips} rowKey={(trip) => trip.trip_id} empty="No trips are scheduled for today." emptyIcon={CalendarClock} />;
}

function AlertsCard({ alerts }) {
  return (
    <OpCard
      icon={BellRing}
      title="Alerts"
      subtitle="From today's trips, crew assignments and GPS reports"
      badge={<OpChip tone={alerts.length ? 'warning' : 'success'}>{alerts.length ? `${alerts.length} open` : 'All clear'}</OpChip>}
    >
      {alerts.length === 0 ? <OpEmpty icon={CheckCircle2}>No alerts. Today&apos;s trips are running without delays, crew gaps or GPS problems.</OpEmpty> : (
        <ul className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
          {alerts.map((alert) => (
            <li key={alert.key} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${ALERT_STYLE[alert.tone] ?? ALERT_STYLE.info}`} aria-hidden="true">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{alert.detail}</p>
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
      icon={Navigation}
      title="Route adherence"
      subtitle="Last 7 days, from recorded GPS positions. Trips with no GPS history are not counted."
      badge={overall === null ? null : <OpChip tone={overall >= 90 ? 'success' : 'warning'}>{overall}% overall</OpChip>}
    >
      {loading ? <p className="text-sm text-slate-500">Loading GPS history...</p>
        : error ? <OpEmpty icon={MapPinOff}>The adherence report could not be loaded right now.</OpEmpty>
          : withData.length === 0 && failed.length === 0 ? <OpEmpty icon={MapPinOff}>No GPS history for the last 7 days yet, so adherence cannot be calculated.</OpEmpty> : (
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

function DispatchDecisionBoard({ advice, saving, error, onDecide }) {
  const open = advice.filter((item) => !item.decision).length;
  return (
    <OpCard
      icon={Scale}
      title="Dispatch decision board"
      subtitle="The system recommends. The operator decides. Bus assignments and routes are never changed automatically."
      badge={<OpChip tone={open ? 'warning' : 'success'}>{open ? `${open} awaiting decision` : 'No open advice'}</OpChip>}
    >
      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Operational advice</h3>
      {advice.length === 0 ? <OpEmpty icon={CheckCircle2}>No route needs review right now.</OpEmpty> : (
        <ul className="space-y-3">
          {advice.map((item) => <RerouteAdviceItem key={item.key} item={item} saving={saving} onDecide={onDecide} />)}
        </ul>
      )}
      {error && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      {/* 2026-10-29: the decision history list was removed; every decision stays in the audit log. */}
    </OpCard>
  );
}

function SuggestedAssignments({ deployment, onOpenSchedule }) {
  return (
    <OpCard icon={Shuffle} title="Suggested bus assignments" subtitle="Idle fleets matched against routes under pressure (delays or near-full trips).">
      {deployment.length === 0 ? <OpEmpty icon={CheckCircle2}>Every fleet has a trip today and no route is under pressure.</OpEmpty> : (
        <ul className="space-y-2.5">
          {deployment.map((item) => (
            <li key={item.key} className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm leading-relaxed text-slate-700">
              <Bus className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="min-w-0">{item.text}</span>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onOpenSchedule}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
      >
        Open Schedule <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </OpCard>
  );
}

/**
 * Batch 31 Phase 2: the Operator Dashboard. Every figure is computed from today's trips, the fleet list and the fleets'
 * last GPS positions (utils/operatorDashboardView.js). There is no revenue here (it lives in Finance), no trend arrows,
 * and no map: those either have no real data behind them or belong to other pages.
 */
export default function OperatorDashboardPage({ trips, fleets, operatorName = '', topSlot = null, onRefresh, onOpenCalendar, onOpenSchedule }) {
  const nowMs = useNow();
  const { locations, refresh: refreshLocations } = useFleetLocations();
  const { savingTripId, error, decide } = useDispatchAdvice({ onSaved: onRefresh });
  const view = useMemo(() => buildDashboardView({ trips, fleets, locations, nowMs }), [trips, fleets, locations, nowMs]);
  const { kpis } = view;
  const firstName = String(operatorName || '').trim().split(/\s+/)[0];

  const handleDecide = (item, decision, note) => decide(item.tripId, decision, decisionPayload(item, decision, note));

  return (
    <div className="space-y-6">
      <OpPageHeader
        eyebrow={<span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true" />{getBusinessTodayLabel()}</span>}
        title="Dashboard"
        subtitle={`${greetingFor(nowMs)}${firstName ? `, ${firstName}` : ''}. Here is how today's service is running.`}
        action={(
          <button
            type="button"
            onClick={() => { onRefresh(); void refreshLocations(); }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
          </button>
        )}
      />

      {topSlot}

      <section aria-label="Today at a glance" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
        <OpStat icon={Bus} label="Active buses" value={kpis.activeBuses} hint={`of ${kpis.totalFleets} fleet${kpis.totalFleets === 1 ? '' : 's'}`} tone={kpis.activeBuses ? 'success' : 'neutral'} />
        <OpStat icon={RouteIcon} label="Active trips" value={kpis.activeTrips} hint="boarding or on the road" tone="info" />
        <OpStat icon={AlertTriangle} label="Delayed trips" value={kpis.delayedTrips} hint={kpis.delayedTrips ? 'past departure time' : 'none today'} tone={kpis.delayedTrips ? 'danger' : 'success'} />
        <OpStat icon={Ticket} label="Tickets sold" value={kpis.ticketsSold} hint="today, cancelled trips excluded" />
        <OpStat className="col-span-2 md:col-span-1" icon={CalendarClock} label="Trips today" value={kpis.tripsToday} hint="all statuses" />
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">

          <OpCard icon={ListChecks} title="Today's trips" subtitle="Scheduled, live and finished trips for the business day">
            <TodaysTrips trips={view.todays} locations={locations} nowMs={nowMs} />
          </OpCard>

          <div className="grid gap-6 2xl:grid-cols-2">
            <AlertsCard alerts={view.alerts} />
            <OpCard icon={Lightbulb} title="Recommended actions" subtitle="Suggestions only. Nothing here runs by itself.">
              {view.actions.length === 0 ? <OpEmpty icon={Inbox}>No action is needed right now.</OpEmpty> : (
                <ul className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
                  {view.actions.map((action) => (
                    <li key={action.key} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                      <OpChip tone={PRIORITY_TONE[action.priority]} className="shrink-0 capitalize">{action.priority}</OpChip>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{action.route}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{action.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </OpCard>
          </div>

          <div className="grid gap-6 2xl:grid-cols-2">
            <OpCard icon={Gauge} title="Tickets sold against capacity" subtitle={`By route, today. This counts tickets sold, not people on board. ${HIGH_LOAD_PCT}% or more is called near full.`}>
              {view.loadByRoute.length === 0 ? <OpEmpty icon={Ticket}>No tickets or trips to measure today.</OpEmpty> : (
                <div className="space-y-4">
                  {view.loadByRoute.map((row) => (
                    <OpBar key={row.route} label={row.route} value={row.sold} max={row.capacity} valueLabel={`${row.sold} of ${row.capacity} (${row.pct}%)`} tone={row.pct >= HIGH_LOAD_PCT ? 'warning' : 'info'} />
                  ))}
                </div>
              )}
            </OpCard>
            <OpCard icon={PieChart} title="Trips today by status" subtitle="Tickets sold by scheduled departure hour is shown below.">
              <OpStackedBar segments={view.statusBreakdown} />
              <div className="mt-6 space-y-3">
                {view.soldByHour.length === 0 ? <p className="text-sm text-slate-500">No tickets sold for today&apos;s trips yet.</p> : view.soldByHour.map((row) => (
                  <OpBar key={row.hour} label={row.hour} value={row.sold} max={Math.max(...view.soldByHour.map((r) => r.sold))} valueLabel={`${row.sold} ticket${row.sold === 1 ? '' : 's'}`} tone="info" />
                ))}
              </div>
            </OpCard>
          </div>

          <div className="grid gap-6 2xl:grid-cols-2">
            <OpCard icon={Timer} title="Route delay overview" subtitle="From today's schedule: a trip is delayed when its departure time has passed without departing.">
              <OpTable
                caption="Route delay overview"
                rows={view.delayByRoute}
                rowKey={(row) => row.route}
                empty="No trips on any route today."
                emptyIcon={Timer}
                columns={[
                  { key: 'route', header: 'Route', className: 'font-medium text-slate-900' },
                  { key: 'scheduled', header: 'Scheduled' },
                  { key: 'live', header: 'Live' },
                  { key: 'delayed', header: 'Delayed' },
                  { key: 'status', header: 'Status', render: (row) => <OpChip tone={row.delayed ? 'danger' : 'success'}>{row.status}</OpChip> },
                ]}
              />
            </OpCard>
            <RouteAdherenceCard fleets={fleets} />
          </div>

          <DispatchDecisionBoard advice={view.advice} saving={savingTripId} error={error} onDecide={handleDecide} />
        </div>

        <aside aria-label="Schedule side panel" className="grid min-w-0 content-start gap-6 md:grid-cols-2 xl:grid-cols-1">
          <DashboardCalendar service={OperatorService} onOpenFull={onOpenCalendar} />
          <OpCard icon={CalendarClock} title="Schedule at a glance" subtitle="Your company's trips and crew shifts">
            <CalendarSummaryStrip service={OperatorService} refreshKey={trips} className="grid-cols-1!" />
          </OpCard>
          <SuggestedAssignments deployment={view.deployment} onOpenSchedule={onOpenSchedule} />
        </aside>
      </div>
      {/* 2026-10-27: the roster counts moved to the top of the Staffs page (StaffRoster). */}
    </div>
  );
}
