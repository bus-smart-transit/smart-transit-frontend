import { TRIP_STATUS_CONFIG } from '../config/tripStatusConfig'

const TONES = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  warn: 'border-amber-200 bg-amber-50 text-amber-700',
  live: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  done: 'border-teal-200 bg-teal-50 text-teal-700',
  bad: 'border-rose-200 bg-rose-50 text-rose-700',
}

/**
 * Derives the one display status of a trip from its real state (the trip's
 * lifecycle status plus the last stop acknowledgement), never from a constant.
 *
 * Keys: scheduled | delayed | boarding | in_transit | at_stop | completed | cancelled | unknown
 * "For Approval" is deliberately not here: it is an assignment-level status,
 * not part of the trip lifecycle.
 */
export function deriveTripStatus(trip, { nowMs = Date.now(), atStopWindowSeconds = TRIP_STATUS_CONFIG.atStopWindowSeconds } = {}) {
  const status = String(trip?.status || '').toLowerCase()

  switch (status) {
    case 'cancelled':
      return { key: 'cancelled', label: 'Cancelled', tone: TONES.bad }
    case 'completed':
      return { key: 'completed', label: 'Completed', tone: TONES.done }
    case 'boarding':
      return { key: 'boarding', label: 'Boarding', tone: TONES.info }
    case 'delayed':
      return { key: 'delayed', label: 'Delayed', tone: TONES.warn }
    case 'scheduled':
      return { key: 'scheduled', label: 'Scheduled', tone: TONES.neutral }
    case 'departed':
    case 'in-progress': {
      const ackMs = trip?.last_acknowledged_at ? new Date(trip.last_acknowledged_at).getTime() : NaN
      const atStop = trip?.last_acknowledged_stop_id
        && Number.isFinite(ackMs)
        && nowMs - ackMs >= 0
        && nowMs - ackMs <= atStopWindowSeconds * 1000
      return atStop
        ? { key: 'at_stop', label: 'At stop', tone: TONES.live }
        : { key: 'in_transit', label: 'In transit', tone: TONES.live }
    }
    default:
      return { key: 'unknown', label: 'Status unavailable', tone: TONES.neutral }
  }
}

/**
 * Elapsed/total trip time from the server-side departure and completion
 * timestamps. Returns null until the trip has departed.
 */
export function deriveTripDurationLabel(trip, nowMs = Date.now()) {
  const start = trip?.departed_at ? new Date(trip.departed_at).getTime() : NaN
  if (!Number.isFinite(start)) return null

  const endRaw = trip?.completed_at ? new Date(trip.completed_at).getTime() : nowMs
  const minutes = Math.max(0, Math.round((endRaw - start) / 60000))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
