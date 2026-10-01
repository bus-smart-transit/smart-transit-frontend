import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bus, Clock3, MapPin, Navigation, ShieldCheck, TrainFront } from 'lucide-react'
import RouteMap from '../../Map/RouteMap'
import { useTicketTracking } from '../../../api/hooks/Passenger/useTicketTracking'
import { formatManilaDate } from '../../../utils/dates'

const STATE_STYLE = {
  tracking: { label: 'Live', tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  stale: { label: 'Last known position', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  no_signal: { label: 'No signal yet', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  waiting: { label: 'Not departed yet', tone: 'bg-sky-50 text-sky-800 ring-sky-200' },
  not_yet: { label: 'Tracking opens soon', tone: 'bg-sky-50 text-sky-800 ring-sky-200' },
  arrived: { label: 'Trip completed', tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  ended: { label: 'Tracking closed', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  cancelled: { label: 'Trip cancelled', tone: 'bg-red-50 text-red-800 ring-red-200' },
  unavailable: { label: 'Not available', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
}

// "08:15 (in 12 min)": measured against the server's clock at the time of the answer, so a
// phone with the wrong time still reads correctly.
function etaText(stop, generatedAt) {
  if (!stop?.eta_time) return 'ETA unavailable'
  const minutes = Math.round((Date.parse(stop.eta) - Date.parse(generatedAt)) / 60000)
  const rel = Number.isFinite(minutes) ? (minutes <= 0 ? ' (now)' : ` (in ${minutes} min)`) : ''
  return `${stop.eta_time}${rel}`
}

function StopCard({ icon: Icon, title, stop, generatedAt }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"><Icon size={14} aria-hidden="true" />{title}</p>
      <p className="mt-1 font-display text-lg font-bold text-navy-950">{stop?.name || '-'}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
        <Clock3 size={14} aria-hidden="true" />{etaText(stop, generatedAt)}
      </p>
      {stop?.eta_source && <p className="mt-0.5 text-xs text-slate-400">{stop.eta_source === 'live' ? 'Live estimate' : 'Scheduled time'}</p>}
      {stop?.progress === 'passed' && <p className="mt-1 text-xs font-semibold text-emerald-700">Bus has passed this stop</p>}
    </div>
  )
}

/**
 * /track/:token: follow the bus of one ticket, no account needed. The link is the credential, so the
 * page asks the browser not to send it onward as a referrer (map tile requests would otherwise carry
 * it) and shows only what the server returns for that ticket.
 */
export default function TrackBusPage() {
  const { token } = useParams()
  const { view, status, error, refreshFailed } = useTicketTracking(token)

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'referrer'
    meta.content = 'no-referrer'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  const style = STATE_STYLE[view?.state] || STATE_STYLE.unavailable
  const bus = view?.bus
  const canMap = Boolean(view?.route?.route_id)
  const highlight = view?.boarding?.stop_id && view?.alighting?.stop_id
    ? { fromStopId: view.boarding.stop_id, toStopId: view.alighting.stop_id }
    : null

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-2 font-display text-base font-bold text-navy-950">
            <TrainFront size={20} className="text-teal-600" aria-hidden="true" /> SmartTransit
          </Link>
          <h1 className="text-sm font-semibold text-slate-600 sm:text-base">Track my bus</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
        {status === 'loading' && <p className="text-sm text-slate-500" role="status">Finding your bus...</p>}

        {status === 'notFound' && (
          <div role="alert" className="rounded-2xl bg-white p-6 text-center shadow-card ring-1 ring-slate-200">
            <h2 className="font-display text-lg font-bold text-navy-950">This tracking link is not valid</h2>
            <p className="mt-2 text-sm text-slate-600">Check that the whole link was copied, or open your ticket to get the link again.</p>
            <Link to="/" className="mt-4 inline-block text-sm font-semibold text-navy-800 underline">Go to SmartTransit</Link>
          </div>
        )}

        {status === 'error' && <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">{error}</p>}

        {status === 'ok' && view && (
          <>
            <section aria-label="Bus status" className={`rounded-2xl p-4 ring-1 ring-inset ${style.tone}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-base font-bold"><Bus size={18} aria-hidden="true" />{style.label}</p>
                {view.trip && <p className="text-sm">{formatManilaDate(view.trip.trip_date)} &middot; departs {view.trip.departure_time}</p>}
              </div>
              {view.message && <p className="mt-1 text-sm">{view.message}</p>}
              {view.state === 'not_yet' && view.opens_at && <p className="mt-1 text-sm">Opens at {new Date(view.opens_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })} (Manila time).</p>}
              {view.state === 'stale' && bus && <p className="mt-1 text-sm">Last update {Math.max(1, Math.round(bus.age_seconds / 60))} min ago.</p>}
              {refreshFailed && <p className="mt-1 text-sm" role="status">{error}</p>}
            </section>

            {view.trip?.route_name && <p className="text-sm text-slate-500">Route: <strong className="text-navy-950">{view.trip.route_name}</strong></p>}

            {(view.boarding || view.alighting) && (
              <div className="grid gap-3 sm:grid-cols-2">
                <StopCard icon={MapPin} title="Your boarding stop" stop={view.boarding} generatedAt={view.refresh?.generated_at} />
                <StopCard icon={Navigation} title="Your drop-off" stop={view.alighting} generatedAt={view.refresh?.generated_at} />
              </div>
            )}

            {canMap && (
              <section aria-label="Map" className="h-96 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                <RouteMap
                  routeId={view.route.route_id}
                  direction={view.route.direction}
                  vehicle={bus ? { latitude: bus.latitude, longitude: bus.longitude, recordedAt: bus.recorded_at } : null}
                  highlight={highlight}
                />
              </section>
            )}

            <p className="flex items-start gap-2 text-xs text-slate-500">
              <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              This link follows only the bus for your ticket and anyone who has it can see the same thing, so share it carefully. It does not show or open your ticket or QR code.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
