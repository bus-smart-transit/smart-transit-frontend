import { useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshCw, Bus, AlertTriangle, CalendarDays, BellRing, CheckCircle2, ChevronRight, Zap, CalendarPlus,
  ClipboardCheck, Users, Clock3, Route as RouteIcon, UsersRound, Lightbulb, Shuffle, CalendarClock,
} from 'lucide-react';
import { OpPageHeader, OpCard, OpChip, OpStat, OpEmpty, OpDelta } from './OperatorUI';
import { accentOf } from './operatorUiTokens';
import { useCanManageCompany } from './companyAdmin';
import DashboardCalendar from '../DashboardCalendar';
import OperatorService from '../../../api/StaffService/OperatorService';
import { useFleetLocations, useNow, useOnTimeTrips } from '../../../api/hooks/Staff/useOperatorDashboardExtras';
import { buildDashboardView } from '../../../utils/operatorDashboardView';
import { routeColorMap } from '../../../utils/routeColors';
import { getBusinessTodayLabel } from '../../../utils/dates';
import OperatorFleetMap from './OperatorFleetMap';

const REFRESH_MIN_MS = 700;
const REFRESH_DONE_MS = 2000;

const ALERT_STYLE = {
  danger: 'border-rose-200 bg-rose-50/60 text-rose-600',
  warning: 'border-amber-200 bg-amber-50/60 text-amber-600',
  info: 'border-sky-200 bg-sky-50/60 text-sky-600',
};
const PRIORITY_TONE = { high: 'danger', medium: 'warning', low: 'info' };

const greetingFor = (nowMs) => {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hourCycle: 'h23' }).format(new Date(nowMs)));
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const plural = (n, word) => `${n} ${word}${Number(n) === 1 ? '' : 's'}`;

/**
 * Batch 60 item 4: one click to what an Operator does most often; each button only opens a page or form.
 * Batch 81 (user, 2026-11-19): the wording follows the Operator's rights. Every Operator schedules trips and handles
 * approvals; only a company admin changes staff and buses (companyAdmin.js), so other Operators "View" them.
 */
function QuickActions({ onCreateSchedule, onOpenApprovals, onOpenStaffs, onOpenFleets }) {
  const canManage = useCanManageCompany();
  const actions = [
    { key: 'schedule', label: 'Schedule a trip', icon: CalendarPlus, accent: 'teal', onClick: onCreateSchedule },
    { key: 'approvals', label: 'Trip approvals', icon: ClipboardCheck, accent: 'blue', onClick: onOpenApprovals },
    { key: 'staffs', label: canManage ? 'Manage staff' : 'View staff', icon: Users, accent: 'violet', onClick: onOpenStaffs },
    { key: 'fleets', label: canManage ? 'Manage fleet' : 'View fleet', icon: Bus, accent: 'orange', onClick: onOpenFleets },
  ];
  return (
    <OpCard icon={Zap} accent="orange" title="Quick actions" subtitle="Common tasks for operators.">
      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ key, label, icon: Icon, accent, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300 hover:bg-teal-50"
          >
            <Icon className={`h-6 w-6 shrink-0 ${accentOf(accent)}`} strokeWidth={1.5} aria-hidden="true" />
            <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{label}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          </button>
        ))}
      </div>
    </OpCard>
  );
}

/**
 * Batch 81 (user, 2026-11-19): Today's trips, one row per route, in the route's colour and R-code (the same as on the
 * live fleet map): the trips today and On time / Delayed.
 */
function TodaysTrips({ rows, colors, onOpenSchedule }) {
  // Batch 81 (user): under the calendar, in the same card.
  return (
    <section aria-label="Today's trips" className="mt-5 border-t border-slate-100 pt-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <CalendarClock className={`mt-0.5 h-6 w-6 shrink-0 ${accentOf('green')}`} strokeWidth={1.5} aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="font-display text-[1.0625rem] font-semibold leading-snug text-slate-900">Today&apos;s trips</h2>
            <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">Scheduled trips today, by route.</p>
          </div>
        </div>
        <button type="button" onClick={onOpenSchedule} aria-label="Open Schedule" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      {rows.length === 0 ? <OpEmpty icon={CalendarClock}>No trips are scheduled today.</OpEmpty> : (
        <ul className="space-y-2" data-testid="todays-trips">
          {rows.map((row) => {
            const tone = colors.get(row.routeId);
            return (
              <li key={row.routeId} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <span className="inline-flex h-7 min-w-9 items-center justify-center rounded-md px-1.5 text-xs font-bold text-white" style={{ backgroundColor: tone?.color || '#64748b' }}>{tone?.code || 'R'}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900" title={row.name}>
                  {row.origin && row.destination ? <>{row.origin} <span aria-hidden="true">&rarr;</span><span className="sr-only">to</span> {row.destination}</> : row.name}
                </span>
                <span className="shrink-0 text-xs text-slate-500">{plural(row.trips, 'trip')}</span>
                <OpChip tone={row.status === 'Delayed' ? 'warning' : 'success'} className="shrink-0">{row.status}</OpChip>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Batch 81: Alerts & updates. The alerts from today's trips (delays, missing crew, GPS, near full) open where they can
 * be dealt with; the system's suggestions (Recommended actions and idle-bus suggestions) follow, as suggestions only.
 */
function AlertsAndUpdates({ alerts, actions, deployment, onOpen }) {
  const empty = alerts.length === 0 && actions.length === 0 && deployment.length === 0;
  return (
    <OpCard
      icon={BellRing}
      accent="rose"
      title="Alerts & updates"
      subtitle="Operational notices that need your attention."
      badge={<OpChip tone={alerts.length ? 'warning' : 'success'}>{alerts.length ? `${alerts.length} open` : 'All clear'}</OpChip>}
    >
      {empty ? <OpEmpty icon={CheckCircle2}>No alerts. Today&apos;s trips are running without delays, crew gaps or GPS problems.</OpEmpty> : (
        <ul className="-mx-2 max-h-[26rem] divide-y divide-slate-100 overflow-y-auto pr-1">
          {alerts.map((alert) => (
            <li key={alert.key}>
              <button type="button" onClick={() => onOpen(alert)} data-testid="dashboard-alert" className="flex w-full items-start gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-slate-50">
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${ALERT_STYLE[alert.tone] ?? ALERT_STYLE.info}`} aria-hidden="true">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{alert.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{alert.detail}</span>
                  <span className="mt-1 block text-xs font-semibold text-teal-700">{alert.kind === 'crew' ? 'Open the trip in Schedule' : 'Track this bus'}</span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              </button>
            </li>
          ))}
          {actions.map((action) => (
            <li key={action.key} className="flex items-start gap-3 px-2 py-3" data-testid="dashboard-suggestion">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-sky-50/60 text-sky-600" aria-hidden="true"><Lightbulb className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">{action.route}<OpChip tone={PRIORITY_TONE[action.priority]} className="capitalize">{action.priority}</OpChip></span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{action.text} Suggestion only.</span>
              </span>
            </li>
          ))}
          {deployment.map((item) => (
            <li key={item.key} className="flex items-start gap-3 px-2 py-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50/60 text-violet-600" aria-hidden="true"><Shuffle className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1 text-xs leading-relaxed text-slate-600">{item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </OpCard>
  );
}

/**
 * Batch 31 Phase 2: the Operator Dashboard, computed from today's trips, the fleet list and the fleets' last GPS
 * positions (utils/operatorDashboardView.js); nothing is simulated.
 * Batch 81 (user, 2026-11-19, from the designer's mock-up): Active buses, On-time trips, Trips in service and Total
 * passengers; the live fleet map with each route in its colour; Today's trips by route; Alerts & updates; Quick actions;
 * the calendar. The trend lines, Route delay overview, Schedule at a glance and the separate suggestion cards are gone
 * (their content is in Today's trips, Alerts & updates and the calendar).
 */
export default function OperatorDashboardPage({
  trips, fleets, operatorName = '', topSlot = null, onRefresh, onOpenCalendar, onOpenSchedule,
  onCreateSchedule = onOpenSchedule, onOpenApprovals = onOpenSchedule, onOpenStaffs = () => {}, onOpenFleets = () => {},
  onTrackTrip = () => {}, onOpenTrip = () => {},
}) {
  const nowMs = useNow();
  const { locations, refresh: refreshLocations } = useFleetLocations();
  const view = useMemo(() => buildDashboardView({ trips, fleets, locations, nowMs }), [trips, fleets, locations, nowMs]);
  const { kpis } = view;
  const onTime = useOnTimeTrips(trips);
  const colors = useMemo(() => routeColorMap([...view.tripsByRoute.map((row) => row.routeId), ...view.mapBuses.map((bus) => bus.routeId)]), [view.tripsByRoute, view.mapBuses]);
  const firstName = String(operatorName || '').trim().split(/\s+/)[0];
  const inServicePct = kpis.totalFleets > 0 ? Math.round((kpis.activeBuses / kpis.totalFleets) * 100) : null;
  const onTimeToday = onTime?.today ?? null;

  // 2026-11-13 (user): the Refresh button shows that it really refreshed.
  const [refreshState, setRefreshState] = useState('idle');
  const doneTimer = useRef(null);
  useEffect(() => () => clearTimeout(doneTimer.current), []);
  const handleRefresh = async () => {
    if (refreshState === 'refreshing') return;
    clearTimeout(doneTimer.current);
    setRefreshState('refreshing');
    const started = Date.now();
    await Promise.allSettled([(async () => onRefresh?.())(), refreshLocations()]);
    const wait = REFRESH_MIN_MS - (Date.now() - started);
    if (wait > 0) await new Promise((resolve) => { setTimeout(resolve, wait); });
    setRefreshState('done');
    doneTimer.current = setTimeout(() => setRefreshState('idle'), REFRESH_DONE_MS);
  };
  const refreshing = refreshState === 'refreshing';
  const refreshed = refreshState === 'done';

  return (
    <div className="space-y-6">
      <OpPageHeader
        eyebrow={<span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true" />{getBusinessTodayLabel()}</span>}
        title="Dashboard"
        subtitle={`${greetingFor(nowMs)}${firstName ? `, ${firstName}` : ''}. Here is how today's service is running.`}
        action={(
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-busy={refreshing}
            className={`inline-flex min-w-[8.5rem] items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-300 active:scale-95 disabled:cursor-wait ${
              refreshed
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : refreshing
                  ? 'border-teal-300 bg-teal-50 text-teal-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800'
            }`}
          >
            {refreshed
              ? <CheckCircle2 className="h-4 w-4 animate-[op-pop_300ms_ease-out]" aria-hidden="true" />
              : <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />}
            <span aria-live="polite">{refreshed ? 'Updated' : refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        )}
      />

      <div className={`space-y-6 transition-opacity duration-300 ${refreshing ? 'pointer-events-none opacity-50' : 'opacity-100'}`} aria-busy={refreshing}>
        {topSlot}

        <section aria-label="Today at a glance" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <OpStat
            icon={Bus}
            accent="green"
            label="Active buses"
            value={<>{kpis.activeBuses}<span className="text-lg font-semibold text-slate-500"> / {kpis.totalFleets}</span></>}
            hint={inServicePct === null ? 'No fleets yet' : `${inServicePct}% in service`}
            tone={kpis.activeBuses ? 'success' : 'neutral'}
          />
          <OpStat
            icon={Clock3}
            accent="blue"
            label="On-time trips"
            value={onTimeToday?.percent === null || onTimeToday?.percent === undefined ? 'Not provided' : `${onTimeToday.percent}%`}
            delta={onTimeToday ? <OpDelta current={onTimeToday.percent} previous={onTime?.last_week?.percent ?? null} label="vs last week" unit="pts" /> : null}
            hint={onTimeToday?.departed ? `${onTimeToday.on_time} of ${onTimeToday.departed} left within ${onTime.grace_minutes} min` : 'No trip has left yet today'}
            tone="info"
          />
          <OpStat
            icon={RouteIcon}
            accent="violet"
            label="Trips in service"
            value={kpis.activeTrips}
            hint={`of ${kpis.scheduledToday} scheduled today`}
            tone={kpis.activeTrips ? 'success' : 'neutral'}
          />
          <OpStat
            icon={UsersRound}
            accent="orange"
            label="Total passengers"
            value={kpis.ticketsSold}
            hint={`tickets today, ${kpis.scannedIn} scanned in so far`}
            tone="neutral"
          />
        </section>

        {/* Batch 81 (user, 2026-11-19): the calendar with Today's trips under it in one card, beside the map; the alerts
            and quick actions below, so nothing in the calendar needs a scroll to be seen. */}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0 space-y-6">
            <OperatorFleetMap routes={view.tripsByRoute} buses={view.mapBuses} colors={colors} onOpenFull={onOpenFleets} />
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <AlertsAndUpdates
                alerts={view.alerts}
                actions={view.actions}
                deployment={view.deployment}
                onOpen={(alert) => (alert.kind === 'crew' ? onOpenTrip(alert.tripId) : onTrackTrip(alert.tripId))}
              />
              <QuickActions onCreateSchedule={onCreateSchedule} onOpenApprovals={onOpenApprovals} onOpenStaffs={onOpenStaffs} onOpenFleets={onOpenFleets} />
            </div>
          </div>
          <DashboardCalendar service={OperatorService} onOpenFull={onOpenCalendar}>
            <TodaysTrips rows={view.tripsByRoute} colors={colors} onOpenSchedule={onOpenSchedule} />
          </DashboardCalendar>
        </div>
      </div>
    </div>
  );
}
