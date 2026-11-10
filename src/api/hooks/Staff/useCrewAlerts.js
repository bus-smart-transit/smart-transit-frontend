import { useCallback, useEffect, useState } from 'react'
import { useLiveChannels, useLiveEvent } from '../useLive'

const POLL_OPEN_MS = 30000

/** The phone's position for an alert, if it can be had quickly (never blocks sending for long). */
function currentPosition(timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { resolve(null); return }
    let done = false
    const finish = (value) => { if (!done) { done = true; resolve(value) } }
    setTimeout(() => finish(null), timeoutMs + 500)
    navigator.geolocation.getCurrentPosition(
      (pos) => finish({ latitude: Number(pos.coords.latitude), longitude: Number(pos.coords.longitude) }),
      () => finish(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 },
    )
  })
}

/**
 * Batch 58 (user, 2026-11-10): the crew's "Alert operator" for their current trip. Loads the trip's alerts and the
 * types to choose from (from the server), sends one with the phone's position when it can, lets the sender take it back
 * within the server's window, and refreshes when the operator handles it (live notification, or every 30 s while an
 * alert is open). Works the same for the Driver and the Chauffeur (`service`).
 */
export default function useCrewAlerts(service, tripId) {
  const [alerts, setAlerts] = useState([])
  const [types, setTypes] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const channels = useLiveChannels()

  const load = useCallback(async () => {
    if (!tripId) { setAlerts([]); return }
    try {
      const res = await service.getCrewAlerts(tripId)
      setAlerts(Array.isArray(res?.data?.alerts) ? res.data.alerts : [])
      setTypes(Array.isArray(res?.data?.types) ? res.data.types : [])
    } catch {
      // keep what is shown; the next refresh tries again
    }
  }, [service, tripId])

  useEffect(() => {
    const first = setTimeout(() => { void load() }, 0)
    return () => clearTimeout(first)
  }, [load])

  const hasOpen = alerts.some((alert) => alert.status === 'open')
  useEffect(() => {
    if (!hasOpen) return undefined
    const id = setInterval(() => { void load() }, POLL_OPEN_MS)
    return () => clearInterval(id)
  }, [hasOpen, load])

  useLiveEvent(channels?.user, 'notification', (update) => {
    if (update?.type === 'crew_alert_handled') void load()
  }, { isPrivate: true })

  const raise = async (type, note = '') => {
    setSending(true)
    setError('')
    try {
      const position = await currentPosition()
      await service.raiseCrewAlert(tripId, { type, ...(note ? { note } : {}), ...(position || {}) })
      await load()
      return true
    } catch (err) {
      setError(err?.message ? `Not sent. Call your operator. (${err.message})` : 'Not sent. Call your operator.')
      return false
    } finally {
      setSending(false)
    }
  }

  const cancel = async (alertId) => {
    setError('')
    try {
      await service.cancelCrewAlert(alertId)
      await load()
    } catch (err) {
      setError(err?.message || 'Could not take the alert back. Call your operator.')
    }
  }

  return { latest: alerts[0] || null, types, sending, error, raise, cancel, reload: load }
}
