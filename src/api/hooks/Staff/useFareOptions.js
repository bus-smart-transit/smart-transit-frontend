import { useEffect, useState } from 'react'
import { getFareOptions } from '../../../services/bookingService'

// The lists the fleet and fare forms are built from come from the server (GET /api/fare/options), so a new vehicle
// class or rounding mode is a config change, not a code change. Until the answer arrives (or if it fails) the
// forms offer nothing but "not specified", never a hardcoded list.
const EMPTY = { vehicle_classes: [], service_types: [], rounding_modes: [], rounding_increment: '', seat_types: [] }

let cached = null
let inflight = null

export default function useFareOptions() {
  const [options, setOptions] = useState(cached ?? EMPTY)

  useEffect(() => {
    if (cached) return undefined
    let cancelled = false
    inflight = inflight ?? getFareOptions().then((data) => { cached = { ...EMPTY, ...(data ?? {}) }; return cached }).catch(() => { inflight = null; return null })
    inflight.then((value) => { if (!cancelled && value) setOptions(value) })
    return () => { cancelled = true }
  }, [])

  return options
}
