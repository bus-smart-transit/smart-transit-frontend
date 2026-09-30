import { useState } from 'react'
import { Bus, MapPin, Loader } from 'lucide-react'
import { etaLabel, formatDuration, groupTimelineRows, journeyFacts, nodeState } from '../../../utils/tripTimeline'

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
  if (!time) return <span className="text-xs text-slate-400">ETA unavailable</span>
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
        <span className="flex flex-wrap items-center gap-1.5 text-[0.7rem] text-slate-400">
          {row.municipality && <span>{row.municipality}</span>}
          {row.is_boarding && <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-700">Board here</span>}
          {row.is_alighting && <span className="rounded bg-sky-100 px-1.5 py-0.5 font-semibold text-sky-700">Get off here</span>}
          {row.custom && row.distance_from_route_m != null && (
            <span>{Math.round(row.distance_from_route_m)} m from the route line</span>
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
 * A2: the trip timeline. Rows, ETAs, journey flags and totals all come from the
 * server (GET /trips/{id}/timeline); choosing a stop or a drop-off pin asks the
 * server to recompute. Nothing is invented: a missing ETA reads "ETA unavailable".
 */
export default function TripTimeline({
  timeline,
  loading = false,
  error = null,
  canSelect = true,
  onSelectAlighting,
  onOpenCustomDropoff,
  onClearCustomDropoff,
}) {
  const [expanded, setExpanded] = useState({})

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

  return (
    <section className="rounded-xl border border-slate-200 bg-white" aria-label="Trip timeline">
      <header className="border-b border-slate-100 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bound for</p>
        <h3 className="font-display text-lg font-bold text-navy-950">{header.bound_for}</h3>
        {header.via?.length > 0 && <p className="mt-0.5 text-xs text-slate-500">via {header.via.join(', ')}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          {bus?.plate_number && <span className="inline-flex items-center gap-1"><Bus size={13} /> {bus.plate_number}</span>}
          {timeline.trip?.departure_time && <span>Departs {timeline.trip.departure_time}</span>}
          {facts.map((fact) => (
            <span key={fact.label}><span className="text-slate-400">{fact.label}: </span><strong className="text-navy-950">{fact.value}</strong></span>
          ))}
        </div>
        {!hasAlighting && <p className="mt-2 text-xs text-slate-500">Choose where you get off to see your journey time and fare.</p>}
        {error && <p className="mt-2 text-xs text-red-600">{error.message}</p>}
      </header>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-100 px-4 py-2 text-[0.7rem] text-slate-500" aria-label="Legend">
        {LEGEND.map((entry) => (
          <li key={entry.state} className="inline-flex items-center gap-1.5">
            <span className={`block h-2.5 w-2.5 rounded-full border-2 ${NODE_STYLE[entry.state]}`} aria-hidden="true" />
            {entry.label}
          </li>
        ))}
      </ul>

      <ol className="relative space-y-0.5 p-3">
        {items.map((item) => {
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
        })}
      </ol>

      {(timeline.allow_custom_dropoff || journey?.custom_dropoff) && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-slate-100 p-3">
          {timeline.allow_custom_dropoff && (
            <button
              type="button"
              onClick={onOpenCustomDropoff}
              disabled={!journey?.boarding_stop_id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-navy-800 px-3 py-1.5 text-xs font-semibold text-navy-800 transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MapPin size={14} /> Drop off somewhere else (pin on map)
            </button>
          )}
          {journey?.custom_dropoff && (
            <button type="button" onClick={onClearCustomDropoff} className="text-xs font-medium text-slate-500 underline">
              Use a route stop instead
            </button>
          )}
          {formatDuration(header.duration_minutes) == null && hasAlighting && (
            <span className="text-xs text-slate-400">Journey time unavailable</span>
          )}
        </footer>
      )}
    </section>
  )
}
