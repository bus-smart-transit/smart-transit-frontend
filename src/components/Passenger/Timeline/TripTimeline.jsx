import { useState } from 'react'
import { Bus, Loader } from 'lucide-react'
import { compactJourneyRows, etaLabel, formatDuration, groupTimelineRows, journeyFacts, nodeState } from '../../../utils/tripTimeline'
import { busLabelText } from '../../../utils/busLabel'
import RunInfoChips from '../../ui/RunInfoChips'
import { clock12 } from '../../../utils/clock';

const NODE_STYLE = {
  passed: 'border-slate-400 bg-slate-400',
  current: 'border-emerald-500 bg-emerald-500 ring-4 ring-emerald-200',
  upcoming: 'border-slate-400 bg-white',
  custom: 'border-amber-500 bg-amber-400',
}

const LEGEND = [
  { state: 'passed', label: 'Passed' },
  { state: 'current', label: 'Next stop' },
  { state: 'upcoming', label: 'Upcoming' },
  { state: 'custom', label: 'Custom drop-off' },
]

function EtaCell({ row }) {
  const time = etaLabel(row)
  if (!time) return <span className="text-xs text-slate-400">Arrival time not available</span>
  return (
    <span className="text-right">
      <span className="text-sm font-semibold text-navy-950">{time}</span>
      {row.eta_source === 'live' && <span className="ml-1 text-[0.65rem] font-medium text-emerald-600">live</span>}
    </span>
  )
}

function TimelineRow({ row, canSelect, onSelect }) {
  const state = nodeState(row)
  const dimmed = row.in_journey === false
  const isPassThrough = row.type === 'pass_through'
  const selectable = canSelect && row.selectable && !row.is_boarding

  const body = (
    <>
      <span className="relative flex w-5 justify-center">
        <span className={`mt-1 block rounded-full border-2 ${isPassThrough ? 'h-2 w-2' : 'h-3.5 w-3.5'} ${NODE_STYLE[state]}`} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className={`block truncate text-sm ${isPassThrough ? 'text-slate-500' : 'font-semibold text-navy-950'}`}>{row.name}</span>
        <span className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
          {row.municipality && <span>{row.municipality}</span>}
          {row.type === 'stop' && <span className="rounded-full bg-navy-50 px-2 py-0.5 font-semibold text-navy-700">Stop</span>}
          {row.is_boarding && <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-700">You board here</span>}
          {row.is_alighting && <span className="rounded bg-sky-100 px-1.5 py-0.5 font-semibold text-sky-700">You get off here</span>}
          {row.point_kind && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold capitalize text-amber-800">{row.point_kind}</span>}
          {row.custom && !row.point_kind && row.distance_from_route_m != null && (
            <span>{Math.round(row.distance_from_route_m)} m from the bus route</span>
          )}
        </span>
      </span>
      <EtaCell row={row} />
    </>
  )

  const classes = `flex items-start gap-2.5 rounded-lg px-2 py-1.5 ${dimmed ? 'opacity-50' : ''} ${
    row.is_boarding || row.is_alighting ? 'bg-slate-50 ring-1 ring-inset ring-slate-200' : ''
  }`

  if (selectable) {
    return (
      <li>
        <button
          type="button"
          onClick={() => onSelect(row.stop_id)}
          className={`${classes} w-full transition hover:bg-navy-50 focus:outline-none focus:ring-2 focus:ring-navy-700/40`}
          aria-label={`Get off at ${row.name}`}
        >
          {body}
        </button>
      </li>
    )
  }
  return <li className={classes}>{body}</li>
}

/**
 * The trip timeline and alighting-stop choices come from server-computed data.
 *
 * 2026-11-24 (user): `compact` is the booking page's version: "Route and stops" with the short stop list
 * (compactJourneyRows) and no repeat of what the trip overview above already shows. `footer` (for example the route
 * map button) closes the card.
 */
export default function TripTimeline({
  timeline,
  loading = false,
  error = null,
  canSelect = true,
  onSelectAlighting,
  compact = false,
  footer = null,
}) {
  const [expanded, setExpanded] = useState({})
  const [showAll, setShowAll] = useState(false)

  if (!timeline) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
        {loading ? <><Loader size={16} className="animate-spin" /> Loading timeline...</> : (error?.message || 'No timeline to show yet.')}
      </div>
    )
  }

  const { header, bus, stops, journey } = timeline
  const items = groupTimelineRows(stops, timeline.collapse_min_stops)
  const facts = journeyFacts(timeline)
  const hasAlighting = Boolean(journey?.alighting_stop_id || journey?.custom_dropoff)
  const short = compact ? compactJourneyRows(stops) : null
  const folded = short && !showAll ? short : null
  // The legend explains passed and next-stop marks; before the bus leaves every stop is upcoming, so compact hides it.
  const showLegend = !compact || (stops || []).some((row) => ['passed', 'current'].includes(nodeState(row)))

  const renderItem = (item) => {
    if (item.kind === 'row') {
      return <TimelineRow key={item.row.stop_id ?? 'custom'} row={item.row} canSelect={canSelect} onSelect={onSelectAlighting} />
    }
    const open = Boolean(expanded[item.id])
    const label = item.reason === 'outside'
      ? `${item.rows.length} stops outside your journey`
      : `${item.rows.length} stops`
    return (
      <li key={item.id}>
        <button
          type="button"
          onClick={() => setExpanded((prev) => ({ ...prev, [item.id]: !open }))}
          aria-expanded={open}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-slate-500 hover:bg-slate-50"
        >
          <span className="flex w-5 justify-center" aria-hidden="true"><span className="block h-4 w-px bg-slate-300" /></span>
          <span>{open ? 'Hide' : 'Show'} {label}</span>
        </button>
        {open && (
          <ul className="space-y-0.5">
            {item.rows.map((row) => (
              <TimelineRow key={row.stop_id} row={row} canSelect={canSelect} onSelect={onSelectAlighting} />
            ))}
          </ul>
        )}
      </li>
    )
  }

  const foldToggle = (label, open) => (
    <li>
      <button
        type="button"
        onClick={() => setShowAll(open)}
        aria-expanded={!open}
        className="flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-navy-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700/40"
        data-testid="timeline-show-all"
      >
        <span className="flex w-5 justify-center" aria-hidden="true"><span className="block h-4 border-l-2 border-dotted border-slate-300" /></span>
        <span>{label}</span>
      </button>
    </li>
  )

  if (compact) {
    const runFacts = facts.filter((fact) => fact.label !== 'Duration')
    return (
      <section className="rounded-2xl border border-slate-200 bg-white shadow-card" aria-labelledby="route-stops-title">
        <header className="px-5 pb-3 pt-5 sm:px-6">
          <h2 id="route-stops-title" className="font-display text-lg font-semibold text-navy-950">Route and stops</h2>
          <p className="mt-1 text-sm text-slate-600">
            Bus bound for <strong className="font-semibold text-navy-950">{header.bound_for}</strong>
            {header.via?.length > 0 && <span className="text-slate-500">, via {header.via.join(', ')}</span>}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <RunInfoChips runPattern={timeline.trip?.run_pattern} service={timeline.trip?.service} serviceType={timeline.trip?.service_type} showStops />
            <span data-testid="timeline-bus-class">
              {bus?.class_label || 'Bus type not set'}
              {' \u00b7 '}
              {bus?.fleet_type ? `${bus.fleet_type.charAt(0).toUpperCase()}${bus.fleet_type.slice(1)}` : 'Service type not set'}
            </span>
            {runFacts.map((fact) => (
              <span key={fact.label}><span className="text-slate-400">{fact.label}: </span><strong className="text-navy-950">{fact.value}</strong></span>
            ))}
          </div>
          {!hasAlighting && <p className="mt-2 text-sm text-slate-600">Choose where you get off to see your journey time and fare.</p>}
          {error && <p role="alert" className="mt-2 text-xs text-red-600">{error.message}</p>}
        </header>

        {showLegend && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 px-5 py-2 text-xs text-slate-500 sm:px-6" aria-label="Legend">
            {LEGEND.map((entry) => (
              <li key={entry.state} className="inline-flex items-center gap-1.5">
                <span className={`block h-2.5 w-2.5 rounded-full border-2 ${NODE_STYLE[entry.state]}`} aria-hidden="true" />
                {entry.label}
              </li>
            ))}
          </ul>
        )}

        <ol className="space-y-0.5 border-t border-slate-100 px-3 py-3 sm:px-4" aria-label="Stops">
          {folded ? (
            <>
              {folded.before.map((row) => <TimelineRow key={row.stop_id ?? 'custom'} row={row} canSelect={canSelect} onSelect={onSelectAlighting} />)}
              {foldToggle(`Show all ${folded.hidden} more stops`, true)}
              <TimelineRow key={folded.last.stop_id ?? 'custom-last'} row={folded.last} canSelect={canSelect} onSelect={onSelectAlighting} />
            </>
          ) : (
            <>
              {items.map(renderItem)}
              {short && foldToggle('Show fewer stops', false)}
            </>
          )}
        </ol>

        {formatDuration(header.duration_minutes) == null && hasAlighting && (
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:px-6">Journey time unavailable</p>
        )}
        {footer && <div className="border-t border-slate-100 px-5 py-4 sm:px-6">{footer}</div>}
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white" aria-label="Trip timeline">
      <header className="border-b border-slate-100 p-4">
        <h2 className="mb-2 font-display text-lg font-semibold text-navy-950">Travel Advice</h2>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bound for</p>
        <h3 className="font-display text-lg font-bold text-navy-950">{header.bound_for}</h3>
        {header.via?.length > 0 && <p className="mt-0.5 text-xs text-slate-500">via {header.via.join(', ')}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1" data-testid="timeline-bus-label"><Bus size={13} /> {busLabelText(bus?.label)}</span>
          <RunInfoChips runPattern={timeline.trip?.run_pattern} service={timeline.trip?.service} serviceType={timeline.trip?.service_type} showStops />
          <span data-testid="timeline-bus-class">
            {bus?.class_label || 'Bus type not set'}
            {' \u00b7 '}
            {bus?.fleet_type ? `${bus.fleet_type.charAt(0).toUpperCase()}${bus.fleet_type.slice(1)}` : 'Service type not set'}
          </span>
          {timeline.trip?.departure_time && <span>Departs {clock12(timeline.trip.departure_time) || timeline.trip.departure_time}</span>}
          {facts.map((fact) => (
            <span key={fact.label}><span className="text-slate-400">{fact.label}: </span><strong className="text-navy-950">{fact.value}</strong></span>
          ))}
        </div>
        {!hasAlighting && <p className="mt-2 text-xs text-slate-500">Choose where you get off to see your journey time and fare.</p>}
        {error && <p className="mt-2 text-xs text-red-600">{error.message}</p>}
      </header>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-100 px-4 py-2 text-xs text-slate-500" aria-label="Legend">
        {LEGEND.map((entry) => (
          <li key={entry.state} className="inline-flex items-center gap-1.5">
            <span className={`block h-2.5 w-2.5 rounded-full border-2 ${NODE_STYLE[entry.state]}`} aria-hidden="true" />
            {entry.label}
          </li>
        ))}
      </ul>

      <ol className="relative space-y-0.5 p-3">
        {items.map(renderItem)}
      </ol>

      {formatDuration(header.duration_minutes) == null && hasAlighting && (
        <footer className="border-t border-slate-100 p-3">
          <span className="text-xs text-slate-400">Journey time unavailable</span>
        </footer>
      )}
    </section>
  )
}
