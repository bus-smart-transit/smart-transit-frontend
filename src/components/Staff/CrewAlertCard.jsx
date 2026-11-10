import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Phone } from 'lucide-react'
import useCrewAlerts from '../../api/hooks/Staff/useCrewAlerts'
import { crewAlertStatusText } from '../../utils/crewAlerts'
import { formatManilaDateTime } from '../../utils/dates'

const HOLD_MS = 2000
// Batch 58 (user): the trip states an alert can be sent from (the server checks too).
const ALERT_STATUSES = ['boarding', 'departed', 'in-progress', 'delayed']

/**
 * Batch 58 (user, 2026-11-10): "Alert operator" for the Driver and the Chauffeur. Hold the button for 2 seconds (so it
 * is not sent by a bump), then choose what happened; it goes to every Operator of the company with where the bus is.
 * It alerts the bus company only: the card says so and offers to call 911. A mistaken alert can be taken back for a
 * short time. Shown only while the trip is boarding, delayed or on the road.
 */
export default function CrewAlertCard({ service, trip }) {
  const tripId = trip?.trip_id ?? null
  const status = String(trip?.status || '').toLowerCase()
  const alerts = useCrewAlerts(service, ALERT_STATUSES.includes(status) ? tripId : null)
  const [choosing, setChoosing] = useState(false)
  const [note, setNote] = useState('')
  const [progress, setProgress] = useState(0)
  const timer = useRef(null)
  const started = useRef(0)

  const stopHold = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setProgress(0)
  }
  useEffect(() => () => stopHold(), [])

  if (!tripId || !ALERT_STATUSES.includes(status)) return null

  const startHold = () => {
    stopHold()
    started.current = Date.now()
    timer.current = setInterval(() => {
      const done = Math.min(1, (Date.now() - started.current) / HOLD_MS)
      setProgress(done)
      if (done >= 1) {
        stopHold()
        setChoosing(true)
      }
    }, 50)
  }

  const send = async (type) => {
    if (await alerts.raise(type, note.trim())) {
      setChoosing(false)
      setNote('')
    }
  }

  const latest = alerts.latest
  const showLatest = latest && latest.status !== 'cancelled'

  return (
    <section aria-label="Alert operator" className="staff-card border-rose-200" data-testid="crew-alert-card">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">Need help on this trip?</h3>
          <p className="mt-1 text-xs text-slate-500">Breakdown, accident or a blocked road: alert your operator. This tells your bus company only. In an emergency, call 911.</p>
        </div>
      </div>

      {showLatest && (
        <div className={`mt-3 rounded-xl px-3 py-2 text-sm ${latest.status === 'handled' ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`} role="status" data-testid="crew-alert-status">
          <p className="font-semibold">{latest.type_label} · {formatManilaDateTime(latest.raised_at)}</p>
          <p className="mt-0.5">{crewAlertStatusText(latest)}</p>
          {latest.can_cancel && (
            <button type="button" onClick={() => void alerts.cancel(latest.alert_id)} className="mt-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100">
              Take back (sent by mistake)
            </button>
          )}
        </div>
      )}

      {alerts.error && <p role="alert" className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{alerts.error}</p>}

      {choosing ? (
        <div className="mt-3 space-y-2" data-testid="crew-alert-choose">
          <p className="text-sm font-semibold text-slate-900">What happened?</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {alerts.types.map((type) => (
              <button
                key={type.key}
                type="button"
                disabled={alerts.sending}
                onClick={() => void send(type.key)}
                className="min-h-14 rounded-xl bg-rose-600 px-4 text-base font-bold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {type.label}
              </button>
            ))}
          </div>
          <label className="block text-xs text-slate-600">
            Note (optional)
            <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={255} placeholder="For example: flat tyre near the market" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" />
          </label>
          {alerts.sending && <p role="status" className="text-xs text-slate-500">Sending...</p>}
          <button type="button" onClick={() => setChoosing(false)} className="text-xs font-semibold text-slate-500 underline">Cancel</button>
        </div>
      ) : (
        <button
          type="button"
          onPointerDown={startHold}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setChoosing(true) } }}
          className="relative mt-3 min-h-14 w-full select-none overflow-hidden rounded-xl bg-rose-600 px-4 text-base font-bold text-white hover:bg-rose-700"
          aria-describedby="crew-alert-hold-hint"
        >
          <span className="absolute inset-y-0 left-0 bg-rose-900/40" style={{ width: `${Math.round(progress * 100)}%` }} aria-hidden="true" />
          <span className="relative">{progress > 0 ? 'Keep holding...' : 'Hold to alert operator'}</span>
        </button>
      )}
      <p id="crew-alert-hold-hint" className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Hold for 2 seconds, then choose what happened.</span>
        <a href="tel:911" className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-100">
          <Phone size={12} aria-hidden="true" />Call 911
        </a>
      </p>
    </section>
  )
}
