import { useEffect, useRef, useState } from 'react'
import { getTracking } from '../../../services/trackingService'
import { useLiveChannels, useLiveRefresh } from '../useLive'

// States after which nothing more will change; polling stops.
const FINAL_STATES = new Set(['arrived', 'ended', 'cancelled', 'unavailable'])

/**
 * Follows one ticket's bus: loads the tracking view, then refreshes at the interval the server
 * asks for (and no more often than every 5 s), pausing while the tab is hidden and stopping once
 * the trip is over. Returns { view, status: 'loading' | 'ok' | 'notFound' | 'error', error }.
 * A failed refresh keeps the last good view and says so (`stale: true`) instead of blanking.
 */
export function useTicketTracking(token) {
  const [state, setState] = useState({ token: null, view: null, status: 'loading', error: '', refreshFailed: false })
  // 2026-11-20: live updates call this to refresh now (set by the polling effect below).
  const reloadNowRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let timer = null
    let loading = false
    let finished = false

    const load = async () => {
      let delay
      let final = false
      loading = true
      try {
        const view = await getTracking(token)
        if (cancelled) return
        delay = Math.max(5, Number(view?.refresh?.poll_seconds) || 10) * 1000
        final = FINAL_STATES.has(view?.state)
        if (view?.state === 'not_yet') {
          const opensAt = Date.parse(view.opens_at)
          const generatedAt = Date.parse(view.refresh?.generated_at)
          const untilOpen = opensAt - generatedAt
          delay = Number.isFinite(untilOpen) && untilOpen > 0
            ? Math.max(5000, Math.min(60000, untilOpen))
            : Math.max(delay, 60000)
        } else if (view?.state === 'waiting') {
          delay = Math.max(delay, 60000)
        }
        setState({ token, view, status: 'ok', error: '', refreshFailed: false })
      } catch (err) {
        if (cancelled) return
        if (err?.response?.status === 404) {
          setState({ token, view: null, status: 'notFound', error: '', refreshFailed: false })
          return // an unknown link never becomes valid by waiting
        }
        const message = err?.response?.status === 429
          ? 'Too many requests. Please wait a moment.'
          : 'We could not refresh the bus position. Trying again...'
        setState((prev) => (prev.token === token && prev.view
          ? { ...prev, refreshFailed: true, error: message }
          : { token, view: null, status: 'error', error: message, refreshFailed: false }))
        delay = 15000
      }
      loading = false
      finished = final
      if (!final && !cancelled) schedule(delay)
    }

    const schedule = (delay) => {
      timer = setTimeout(() => {
        if (document.hidden) schedule(2000) // do not poll a tab nobody is looking at
        else void load()
      }, delay)
    }

    // A live update refreshes at once and restarts the wait (never two loads at the same time, nothing after the end).
    reloadNowRef.current = () => {
      if (cancelled || loading || finished) return
      clearTimeout(timer)
      void load()
    }

    void load()
    return () => { cancelled = true; clearTimeout(timer); reloadNowRef.current = null }
  }, [token])

  // 2026-11-20 (live updates): this ticket's bus moving, or its trip changing status, refreshes the view at once.
  const tripId = state.token === token ? state.view?.trip_id : null
  const live = useLiveChannels()
  const isThisTrip = (update) => tripId != null && Number(update?.trip_id) === Number(tripId)
  useLiveRefresh(live?.positions, 'bus.moved', () => reloadNowRef.current?.(), { match: isThisTrip, minGapMs: 3000 })
  useLiveRefresh(live?.trip_status, 'trip.status', () => reloadNowRef.current?.(), { match: isThisTrip })

  const current = state.token === token
  return {
    view: current ? state.view : null,
    status: current ? state.status : 'loading',
    error: current ? state.error : '',
    refreshFailed: current ? state.refreshFailed : false,
  }
}
