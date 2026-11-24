import { useState } from 'react'
import { AlertTriangle, ChevronDown, MapPin, Phone, Volume2, VolumeX } from 'lucide-react'
import { formatManilaDateTime } from '../../../utils/dates'
import Modal from '../../ui/Modal'
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

function OpenAlert({ alert, busy, onHandle, onTell, onTrackBus, as: Tag = 'li' }) {
  const [handling, setHandling] = useState(false)
  const [note, setNote] = useState('')
  const map = alertMapLink(alert)
  const told = Boolean(alert.passengers_told_at)
  return (
    <Tag className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-950" data-testid="operator-alert">
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
          {/* Batch 60 (user, 2026-11-11): where the bus is now, on Fleets (the map link above is where it was). */}
          {onTrackBus && (
            <button
              type="button"
              onClick={() => onTrackBus({ tripId: alert.trip_id, fleetId: alert.trip?.fleet_id ?? null })}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100"
            >
              <MapPin size={13} aria-hidden="true" /> Track bus
            </button>
          )}
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
    </Tag>
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
export default function OperatorAlerts({ alerts, onTrackBus = null }) {
  const [showRecent, setShowRecent] = useState(false)
  if (alerts.open.length === 0 && alerts.recent.length === 0) return null
  return (
    <section aria-label="Crew alerts" className="mb-4 space-y-2" data-testid="operator-alerts">
      {alerts.open.length > 0 && (
        <ul className="space-y-2" aria-label="Open crew alerts">
          {alerts.open.map((alert) => (
            <OpenAlert key={alert.alert_id} alert={alert} busy={alerts.busyId === alert.alert_id} onHandle={alerts.handle} onTell={alerts.tellPassengers} onTrackBus={onTrackBus} />
          ))}
        </ul>
      )}
      {alerts.message && <p role="status" className="text-xs text-slate-600">{alerts.message}</p>}
      {typeof alerts.toggleSound === 'function' && (
        <button type="button" onClick={alerts.toggleSound} aria-pressed={alerts.soundOn} data-testid="alert-sound-toggle" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          {alerts.soundOn ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
          {alerts.soundOn ? 'Alert sound on' : 'Alert sound off'}
        </button>
      )}
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

/** 2026-11-24 (user): the alert sound on or off (shown in the Operator's notification panel). */
export function AlertSoundToggle({ alerts }) {
  if (typeof alerts.toggleSound !== 'function') return null
  return (
    <button type="button" onClick={alerts.toggleSound} aria-pressed={alerts.soundOn} data-testid="alert-sound-toggle" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
      {alerts.soundOn ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
      {alerts.soundOn ? 'Alert sound on' : 'Alert sound off'}
    </button>
  )
}

/**
 * 2026-11-24 (user): the crew alerts inside the Operator's notification panel (they used to sit on top of every page).
 * An open alert is a red row; choosing one opens it in CrewAlertModal with its actions. The last 24 hours' others fold
 * away underneath.
 */
export function CrewAlertList({ alerts, onOpen }) {
  const [showRecent, setShowRecent] = useState(false)
  if (alerts.open.length === 0 && alerts.recent.length === 0) return null
  return (
    <section aria-label="Crew alerts" className="space-y-2" data-testid="operator-alerts">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Crew alerts</p>
      {alerts.open.length > 0 && (
        <ul className="space-y-2" aria-label="Open crew alerts">
          {alerts.open.map((alert) => (
            <li key={alert.alert_id}>
              <button
                type="button"
                onClick={() => onOpen(alert.alert_id)}
                className="flex w-full items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-left text-sm text-rose-950 transition hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                data-testid="operator-alert-row"
              >
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{alert.type_label}</span>
                  <span className="block text-xs text-rose-900/80">{alertBusText(alert)} · {formatManilaDateTime(alert.raised_at)}</span>
                </span>
                <span className="shrink-0 self-center rounded-lg bg-rose-700 px-2.5 py-1 text-xs font-bold text-white">Open</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {alerts.recent.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <button type="button" onClick={() => setShowRecent((value) => !value)} aria-expanded={showRecent} className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-slate-600">
            Crew alerts in the last 24 hours ({alerts.recent.length})
            <ChevronDown size={14} aria-hidden="true" className={showRecent ? 'rotate-180' : ''} />
          </button>
          {showRecent && (
            <ul className="divide-y divide-slate-100 border-t border-slate-100 text-xs text-slate-600">
              {alerts.recent.map((alert) => (
                <li key={alert.alert_id} className="px-3 py-2" data-testid="operator-alert-recent">
                  <button type="button" onClick={() => onOpen(alert.alert_id)} className="w-full text-left hover:underline">
                    <strong className="text-slate-800">{alert.type_label}</strong> · {alertBusText(alert)} · {formatManilaDateTime(alert.raised_at)} · {statusText(alert)}
                    {alert.passengers_told_at ? ` · passengers told (${alert.passengers_told_count ?? 0})` : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * 2026-11-24 (user): one crew alert in a pop-up, opened from its toast or from the notification panel. An open alert
 * shows the emergency type with everything needed to act (crew phones, where the bus was) and the actions: track the
 * bus, tell passengers, mark handled. A closed one shows what happened.
 */
export function CrewAlertModal({ alertId, alerts, onClose, onTrackBus = null }) {
  const alert = (alerts.all || []).find((item) => item.alert_id === alertId) || null
  if (!alert) return null
  const isOpen = alert.status === 'open'
  return (
    <Modal open onClose={onClose} title={isOpen ? `Emergency: ${alert.type_label}` : `Crew alert: ${alert.type_label}`} size="lg" fullScreenOnMobile>
      <div className="space-y-3" data-testid="crew-alert-modal">
        {isOpen ? (
          <OpenAlert
            as="div"
            alert={alert}
            busy={alerts.busyId === alert.alert_id}
            onHandle={alerts.handle}
            onTell={alerts.tellPassengers}
            onTrackBus={onTrackBus ? (request) => { onClose(); onTrackBus(request) } : null}
          />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{alertBusText(alert)} · Trip #{alert.trip_id}</p>
            <p className="mt-1">Sent {formatManilaDateTime(alert.raised_at)} by {alert.raised_by?.name || NOT_PROVIDED} ({crewRoleLabel(alert.raised_role)})</p>
            <p className="mt-1">{statusText(alert)}</p>
          </div>
        )}
        {alerts.message && <p role="status" className="text-xs text-slate-600">{alerts.message}</p>}
      </div>
    </Modal>
  )
}
