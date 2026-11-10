import { useState } from 'react'
import { AlertTriangle, ChevronDown, MapPin, Phone } from 'lucide-react'
import { formatManilaDateTime } from '../../../utils/dates'
import { NOT_PROVIDED, alertBusText, alertMapLink, alertPlaceSource, crewRoleLabel, telHref } from '../../../utils/crewAlerts'

function Person({ label, person }) {
  const href = telHref(person?.phone)
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="text-rose-900/70">{label}:</span>
      <span className="font-semibold">{person?.name || NOT_PROVIDED}</span>
      {href ? (
        <a href={href} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-semibold text-rose-800 ring-1 ring-rose-200 hover:bg-rose-100">
          <Phone size={12} aria-hidden="true" />{person.phone}
        </a>
      ) : <span className="text-rose-900/70">(no phone)</span>}
    </span>
  )
}

function OpenAlert({ alert, busy, onHandle, onTell }) {
  const [handling, setHandling] = useState(false)
  const [note, setNote] = useState('')
  const map = alertMapLink(alert)
  const told = Boolean(alert.passengers_told_at)
  return (
    <li className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-950" data-testid="operator-alert">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
          <AlertTriangle size={13} aria-hidden="true" />{alert.type_label}
        </span>
        <span className="font-semibold">{alertBusText(alert)}</span>
        <span className="text-xs text-rose-900/70">Trip #{alert.trip_id} · {formatManilaDateTime(alert.raised_at)}</span>
      </div>
      <p className="mt-2">
        Sent by <strong>{alert.raised_by?.name || NOT_PROVIDED}</strong> ({crewRoleLabel(alert.raised_role)}){alert.note ? <> · Note: {alert.note}</> : null}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <Person label="Driver" person={alert.trip?.driver} />
        <Person label="Chauffeur" person={alert.trip?.conductor} />
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <MapPin size={13} aria-hidden="true" />
        {map ? (
          <>
            <a href={map} target="_blank" rel="noreferrer" className="font-semibold text-rose-800 underline">See where the bus was</a>
            <span className="text-rose-900/70">{alertPlaceSource(alert)}</span>
          </>
        ) : <span>Where: {NOT_PROVIDED}</span>}
      </p>
      {told && <p className="mt-2 text-xs font-semibold text-emerald-800">Passengers were told ({alert.passengers_told_count ?? 0}).</p>}
      {handling ? (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={async (event) => { event.preventDefault(); if (await onHandle(alert.alert_id, note.trim())) setHandling(false) }}
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">Note for the crew (optional)</span>
            <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={255} placeholder="Note for the crew (optional)" className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-slate-900" />
          </label>
          <button type="submit" disabled={busy} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-60">Mark handled</button>
          <button type="button" onClick={() => setHandling(false)} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-800">Cancel</button>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {!told && (
            <button
              type="button"
              disabled={busy}
              onClick={() => { if (window.confirm('Tell the passengers of this trip that their bus is delayed?')) void onTell(alert.alert_id) }}
              className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
            >
              Tell passengers
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => setHandling(true)} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-60">
            Mark handled
          </button>
        </div>
      )}
    </li>
  )
}

function statusText(alert) {
  if (alert.status === 'cancelled') return `Taken back by the crew${alert.cancelled_at ? ` at ${formatManilaDateTime(alert.cancelled_at)}` : ''}`
  return `Handled by ${alert.handled_by || NOT_PROVIDED}${alert.handled_at ? ` at ${formatManilaDateTime(alert.handled_at)}` : ''}${alert.handled_note ? ` · ${alert.handled_note}` : ''}`
}

/**
 * Batch 58 (user, 2026-11-10): crew alerts across the top of every Operator page. Open alerts stand out with the crew's
 * phone numbers and where the bus was; "Tell passengers" and "Mark handled" are the Operator's choices (passengers are
 * never told automatically). The last 24 hours' other alerts fold away underneath. Renders only (useOperatorAlerts).
 */
export default function OperatorAlerts({ alerts }) {
  const [showRecent, setShowRecent] = useState(false)
  if (alerts.open.length === 0 && alerts.recent.length === 0) return null
  return (
    <section aria-label="Crew alerts" className="mb-4 space-y-2" data-testid="operator-alerts">
      {alerts.open.length > 0 && (
        <ul className="space-y-2" aria-label="Open crew alerts">
          {alerts.open.map((alert) => (
            <OpenAlert key={alert.alert_id} alert={alert} busy={alerts.busyId === alert.alert_id} onHandle={alerts.handle} onTell={alerts.tellPassengers} />
          ))}
        </ul>
      )}
      {alerts.message && <p role="status" className="text-xs text-slate-600">{alerts.message}</p>}
      {alerts.recent.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <button type="button" onClick={() => setShowRecent((value) => !value)} aria-expanded={showRecent} className="flex w-full items-center justify-between px-4 py-2 text-left text-xs font-semibold text-slate-600">
            Crew alerts in the last 24 hours ({alerts.recent.length})
            <ChevronDown size={14} aria-hidden="true" className={showRecent ? 'rotate-180' : ''} />
          </button>
          {showRecent && (
            <ul className="divide-y divide-slate-100 border-t border-slate-100 text-xs text-slate-600">
              {alerts.recent.map((alert) => (
                <li key={alert.alert_id} className="px-4 py-2" data-testid="operator-alert-recent">
                  <strong className="text-slate-800">{alert.type_label}</strong> · {alertBusText(alert)} · {formatManilaDateTime(alert.raised_at)} · {statusText(alert)}
                  {alert.passengers_told_at ? ` · passengers told (${alert.passengers_told_count ?? 0})` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
