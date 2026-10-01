import { useEffect, useState } from 'react'
import { getTracking } from '../../../services/trackingService'

// States after which nothing more will change; polling stops.
const FINAL_STATES = new Set(['ended', 'cancelled', 'unavailable'])

/**
 * Follows one ticket's bus: loads the tracking view, then refreshes at the interval the server
 * asks for (and no more often than every 5 s), pausing while the tab is hidden and stopping once
 * the trip is over. Returns { view, status: 'loading' | 'ok' | 'notFound' | 'error', error }.
 * A failed refresh keeps the last good view and says so (`stale: true`) instead of blanking.
 */
export function useTicketTracking(token) {
  const [state, setState] = useState({ token: null, view: null, status: 'loading', error: '', refreshFailed: false })

  useEffect(() => {
    let cancelled = false
    let timer = null

    const load = async () => {
      let delay
      let final = false
      try {
        const view = await getTracking(token)
        if (cancelled) return
        delay = Math.max(5, Number(view?.refresh?.poll_seconds) || 10) * 1000
        final = FINAL_STATES.has(view?.state)
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
      if (!final && !cancelled) schedule(delay)
    }

    const schedule = (delay) => {
      timer = setTimeout(() => {
        if (document.hidden) schedule(2000) // do not poll a tab nobody is looking at
        else void load()
      }, delay)
    }

    void load()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [token])

  const current = state.token === token
  return {
    view: current ? state.view : null,
    status: current ? state.status : 'loading',
    error: current ? state.error : '',
    refreshFailed: current ? state.refreshFailed : false,
  }
}
