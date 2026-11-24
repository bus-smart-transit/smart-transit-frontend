import { useCallback, useEffect, useRef, useState } from 'react'
import OperatorService from '../../StaffService/OperatorService'
import { useLiveChannels, useLiveConnected, useLiveEvent } from '../useLive'
import { pollEvery } from '../../../utils/liveUpdates'
import { alertSoundEnabled, newlyOpenedAlertIds, playAlertSound, setAlertSoundEnabled } from '../../../utils/alertSound'

const POLL_MS = 30000

/**
 * Batch 58 (user, 2026-11-10): the company's crew alerts for the Operator portal. Loaded at once, then every 30 s (once
 * a minute while live updates arrive), and again the moment a live "alert" update comes in. Every Operator of the
 * company sees the same list (the server scopes it).
 */
// 2026-11-24 (user): onNewOpen gets the alerts that opened since the last read (the page shows a red toast for each).
export default function useOperatorAlerts(service = OperatorService, { onNewOpen } = {}) {
  const onNewOpenRef = useRef(onNewOpen)
  useEffect(() => { onNewOpenRef.current = onNewOpen }, [onNewOpen])
  const [alerts, setAlerts] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState('')
  const channels = useLiveChannels()
  const liveConnected = useLiveConnected()
  // 2026-11-23 (advisor): an alarm sound when a new alert opens (not for the ones already open when the page loads).
  const [soundOn, setSoundOn] = useState(alertSoundEnabled)
  const soundOnRef = useRef(soundOn)
  const seenOpenIds = useRef(null)

  const load = useCallback(async () => {
    try {
      const res = await service.getAlerts()
      const list = Array.isArray(res?.data) ? res.data : []
      const newIds = newlyOpenedAlertIds(seenOpenIds.current, list)
      if (newIds.length > 0 && soundOnRef.current) playAlertSound()
      if (newIds.length > 0) onNewOpenRef.current?.(list.filter((alert) => newIds.includes(alert.alert_id)))
      seenOpenIds.current = new Set(list.filter((alert) => alert.status === 'open').map((alert) => alert.alert_id))
      setAlerts(list)
    } catch {
      // keep the last list; the next poll tries again
    }
  }, [service])

  useEffect(() => {
    const first = setTimeout(() => { void load() }, 0)
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      void load()
    }, pollEvery(POLL_MS, liveConnected))
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [load, liveConnected])

  useLiveEvent(channels?.company, 'alert', () => { void load() }, { isPrivate: true })

  const act = async (alertId, call) => {
    setBusyId(alertId)
    setMessage('')
    try {
      const res = await call()
      setMessage(res?.message || '')
      await load()
      return true
    } catch (err) {
      setMessage(err?.message ? `Could not do that. ${err.message}` : 'Could not do that. Try again.')
      return false
    } finally {
      setBusyId(null)
    }
  }

  return {
    all: alerts,
    open: alerts.filter((alert) => alert.status === 'open'),
    recent: alerts.filter((alert) => alert.status !== 'open'),
    busyId,
    message,
    handle: (alertId, note) => act(alertId, () => service.handleAlert(alertId, note)),
    tellPassengers: (alertId) => act(alertId, () => service.tellPassengersAboutAlert(alertId)),
    reload: load,
    soundOn,
    toggleSound: () => {
      const next = !soundOnRef.current
      soundOnRef.current = next
      setSoundOn(next)
      setAlertSoundEnabled(next)
      if (next) playAlertSound() // the click also lets the browser play sound from now on
    },
  }
}
