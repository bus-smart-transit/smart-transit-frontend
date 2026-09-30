import { useCallback, useEffect, useRef, useState } from 'react'
import { getTripTimeline, readApiError } from '../../../services/bookingService'
import { pollIntervalMs } from '../../../utils/tripTimeline'

/**
 * Loads the server-computed timeline for a trip and keeps it fresh: polling at
 * the server's suggested interval, paused while the tab is hidden and refreshed
 * once when it becomes visible again. Changing the boarding/alighting stop or
 * the custom drop-off pin recomputes on the server (never on the client).
 */
export default function useTripTimeline({ tripId, boardingStopId, alightingStopId, dropoff, seatType }) {
  const requestKey = tripId
    ? [tripId, boardingStopId || '', alightingStopId || '', dropoff ? `${dropoff.lat},${dropoff.lng}` : '', seatType || ''].join('|')
    : null

  const [result, setResult] = useState({ key: null, data: null, error: null })
  const latestRef = useRef({ key: null, selection: null })

  const selection = {
    boarding_stop_id: boardingStopId,
    alighting_stop_id: alightingStopId,
    dropoff_lat: dropoff?.lat,
    dropoff_lng: dropoff?.lng,
    seat_type: seatType,
  }
  // Read inside the fetcher without making the effect depend on a new object each render.
  latestRef.current = { key: requestKey, selection }

  const load = useCallback(async () => {
    const { key, selection: current } = latestRef.current
    if (!key || !tripId) return
    try {
      const data = await getTripTimeline(tripId, current)
      if (latestRef.current.key === key) setResult({ key, data, error: null })
    } catch (err) {
      if (latestRef.current.key === key) setResult((prev) => ({ key, data: prev.data, error: readApiError(err, 'The trip timeline could not be loaded.') }))
    }
  }, [tripId])

  useEffect(() => {
    if (!requestKey) return undefined
    void load()
    return undefined
  }, [requestKey, load])

  const intervalMs = result.key === requestKey ? pollIntervalMs(result.data?.refresh) : null
  useEffect(() => {
    if (!requestKey || !intervalMs) return undefined

    const tick = () => {
      if (document.visibilityState === 'visible') void load()
    }
    const timer = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [requestKey, intervalMs, load])

  const current = result.key === requestKey
  return {
    timeline: current ? result.data : null,
    error: current ? result.error : null,
    loading: Boolean(requestKey) && !current,
    reload: load,
  }
}
