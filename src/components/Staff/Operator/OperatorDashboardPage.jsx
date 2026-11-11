import { useMemo } from 'react';
import {
  RefreshCw, Bus, Route as RouteIcon, AlertTriangle, Ticket, CalendarClock, CalendarDays, BellRing,
  Lightbulb, Timer, Shuffle, CheckCircle2, Inbox, ChevronRight, Zap, CalendarPlus, ClipboardCheck, Users,
} from 'lucide-react';
import { OpPageHeader, OpCard, OpChip, OpStat, OpTable, OpEmpty } from './OperatorUI';
import CalendarSummaryStrip from '../CalendarSummaryStrip';
import DashboardCalendar from '../DashboardCalendar';
import OperatorService from '../../../api/StaffService/OperatorService';
import { useFleetLocations, useNow } from '../../../api/hooks/Staff/useOperatorDashboardExtras';
import { buildDashboardView } from '../../../utils/operatorDashboardView';
import { getBusinessTodayLabel } from '../../../utils/dates';

const PRIORITY_TONE = { high: 'danger', medium: 'warning', low: 'info' };
const ALERT_STYLE = {
  danger: 'border-rose-200 bg-rose-50/60 text-rose-600',
  warning: 'border-amber-200 bg-amber-50/60 text-amber-600',
  info: 'border-sky-200 bg-sky-50/60 text-sky-600',
};

const greetingFor = (nowMs) => {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hourCycle: 'h23' }).format(new Date(nowMs)));
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

/**
 * Batch 60 item 4 (user, 2026-11-11): the dashboard keeps only quick actions and the important information. One click
 * to what an Operator does most often; each button only opens a page or form, nothing runs by itself.
 */
function QuickActions({ onCreateSchedule, onOpenApprovals, onOpenStaffs, onOpenFleets }) {
  const actions = [
    { key: 'schedule', label: 'Schedule a trip', hint: 'Open the Schedule Service form', icon: CalendarPlus, onClick: onCreateSchedule },
    { key: 'approvals', label: 'Trip approvals', hint: 'Requests waiting for you', icon: ClipboardCheck, onClick: onOpenApprovals },
    { key: 'staffs', label: 'Staffs', hint: 'Drivers, Chauffeurs and shifts', icon: Users, onClick: onOpenStaffs },
    { key: 'fleets', label: 'Fleets', hint: 'Buses and live tracking', icon: Bus, onClick: onOpenFleets },
  ];
  return (
    <OpCard icon={Zap} title="Quick actions" subtitle="Go straight to what you do most often.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map(({ key, label, hint, icon: Icon, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className="flex min-h-11 items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300 hover:bg-teal-50"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700" aria-hidden="true"><Icon className="h-[18px] w-[18px]" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">{label}</span>
              <span className="block text-xs text-slate-500">{hint}</span>
            </span>
          </button>
        ))}
      </div>
    </OpCard>
  );
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
 * Batch 60 item 4 (user, 2026-11-11): Today's trips, Tickets sold against capacity, Trips today by status, Route
 * adherence and the Dispatch decision board were removed; the trips are on Schedule, and a decision on a running bus is
 * still made from Fleets (Track). What stays: today's figures, quick actions, alerts, recommended actions, route delays.
 */
export default function OperatorDashboardPage({
  trips, fleets, operatorName = '', topSlot = null, onRefresh, onOpenCalendar, onOpenSchedule,
  onCreateSchedule = onOpenSchedule, onOpenApprovals = onOpenSchedule, onOpenStaffs = () => {}, onOpenFleets = () => {},
}) {
  const nowMs = useNow();
  const { locations, refresh: refreshLocations } = useFleetLocations();
  const view = useMemo(() => buildDashboardView({ trips, fleets, locations, nowMs }), [trips, fleets, locations, nowMs]);
  const { kpis } = view;
  const firstName = String(operatorName || '').trim().split(/\s+/)[0];

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
          <QuickActions onCreateSchedule={onCreateSchedule} onOpenApprovals={onOpenApprovals} onOpenStaffs={onOpenStaffs} onOpenFleets={onOpenFleets} />

          <div className="grid gap-6 lg:grid-cols-2">
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
