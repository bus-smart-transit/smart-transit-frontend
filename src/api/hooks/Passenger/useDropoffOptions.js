import { useEffect, useState } from 'react'
import { getDropoffOptions, readApiError } from '../../../services/bookingService'

/**
 * Batch 28 Stage 3, item 10: the server's drop-off options for a trip and a boarding point (mode, restricted areas,
 * designated points ahead). Read-only feedback for the drop-off screen; the server re-checks every choice itself.
 * Loads only while `enabled`, and again when the trip or boarding point changes.
 */
export default function useDropoffOptions({ tripId, boardingStopId = null, boardingAlongM = null, enabled = true }) {
  const key = enabled && tripId ? [tripId, boardingStopId ?? '', boardingAlongM ?? ''].join('|') : null
  const [state, setState] = useState({ key: null, options: null, error: null })

  useEffect(() => {
    if (!key) return undefined
    let cancelled = false
    getDropoffOptions(tripId, { boardingStopId, boardingAlongM })
      .then((options) => { if (!cancelled) setState({ key, options, error: null }) })
      .catch((err) => { if (!cancelled) setState({ key, options: null, error: readApiError(err, 'The drop-off options could not be loaded.') }) })
    return () => { cancelled = true }
  }, [key, tripId, boardingStopId, boardingAlongM])

  const current = state.key === key
  return { options: current ? state.options : null, error: current ? state.error : null, loading: Boolean(key) && !current }
}