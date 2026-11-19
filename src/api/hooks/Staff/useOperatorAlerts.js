import { useCallback, useEffect, useState } from 'react'
import OperatorService from '../../StaffService/OperatorService'
import { useLiveChannels, useLiveConnected, useLiveEvent } from '../useLive'
import { pollEvery } from '../../../utils/liveUpdates'

const POLL_MS = 30000

/**
 * Batch 58 (user, 2026-11-10): the company's crew alerts for the Operator portal. Loaded at once, then every 30 s (once
 * a minute while live updates arrive), and again the moment a live "alert" update comes in. Every Operator of the
 * company sees the same list (the server scopes it).
 */
export default function useOperatorAlerts(service = OperatorService) {
  const [alerts, setAlerts] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState('')
  const channels = useLiveChannels()
  const liveConnected = useLiveConnected()

  const load = useCallback(async () => {
    try {
      const res = await service.getAlerts()
      setAlerts(Array.isArray(res?.data) ? res.data : [])
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
    open: alerts.filter((alert) => alert.status === 'open'),
    recent: alerts.filter((alert) => alert.status !== 'open'),
    busyId,
    message,
    handle: (alertId, note) => act(alertId, () => service.handleAlert(alertId, note)),
    tellPassengers: (alertId) => act(alertId, () => service.tellPassengersAboutAlert(alertId)),
    reload: load,
  }
}
