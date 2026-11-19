import { useEffect, useState } from 'react'
import { getRegion } from '../../services/regionService'

/** The configured service region (name, bounds, provinces); null until loaded or if unavailable. */
export function useRegion() {
  const [region, setRegion] = useState(null)

  useEffect(() => {
    let cancelled = false
    getRegion()
      .then((value) => { if (!cancelled) setRegion(value) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return region
}
