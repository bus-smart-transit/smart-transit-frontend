import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, Loader } from 'lucide-react'
import Modal from '../../ui/Modal'
import Button from '../../ui/Button'
import RouteMap from '../../Map/RouteMap'
import { readApiError, searchAddress } from '../../../services/bookingService'

const PIN_COLOR = '#f59e0b'

/**
 * D5: the passenger drops a pin (or picks an address) for a custom drop-off. The
 * map is the shared RouteMap (canonical route line, this leg's direction); the
 * server validates and snaps the pin, so this only reports the raw point and
 * shows the server's verdict (`error`).
 *
 * pin: { lat, lng, label? } | null    onPinChange({ lat, lng, label })
 */
export default function CustomDropoffModal({
  open,
  routeId,
  direction,
  highlight,
  pin,
  busy = false,
  error = '',
  onPinChange,
  onClose,
  onConfirm,
}) {
  const [mapHandle, setMapHandle] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const markerRef = useRef(null)
  const onPinChangeRef = useRef(onPinChange)

  useEffect(() => {
    onPinChangeRef.current = onPinChange
  }, [onPinChange])

  // RouteMap gives us the live map once; wire the click-to-pin overlay on it.
  const handleMapReady = useCallback((map, maplibregl) => {
    map.getCanvas().style.cursor = 'crosshair'
    map.on('click', (event) => {
      onPinChangeRef.current?.({ lat: event.lngLat.lat, lng: event.lngLat.lng, label: '' })
    })
    setMapHandle({ map, maplibregl })
  }, [])

  useEffect(() => {
    if (!mapHandle) return undefined
    const { map, maplibregl } = mapHandle
    if (!pin) {
      markerRef.current?.remove()
      markerRef.current = null
      return undefined
    }
    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ color: PIN_COLOR }).setLngLat([pin.lng, pin.lat]).addTo(map)
    } else {
      markerRef.current.setLngLat([pin.lng, pin.lat])
    }
    return undefined
  }, [mapHandle, pin])

  useEffect(() => () => {
    markerRef.current?.remove()
    markerRef.current = null
  }, [])

  const runSearch = async (event) => {
    event.preventDefault()
    setSearchError('')
    setSearching(true)
    try {
      const found = await searchAddress(query.trim())
      setResults(found)
      if (found.length === 0) setSearchError('No matching address in the service region. Drop the pin on the map instead.')
    } catch (err) {
      setResults([])
      setSearchError(readApiError(err, 'Address search is unavailable right now. Drop the pin on the map instead.').message)
    } finally {
      setSearching(false)
    }
  }

  const pickResult = (result) => {
    setResults([])
    setQuery(result.label)
    onPinChange({ lat: result.latitude, lng: result.longitude, label: result.label })
    mapHandle?.map.flyTo({ center: [result.longitude, result.latitude], zoom: 15 })
  }

  return (
    <Modal open={open} onClose={onClose} title="Pin your drop-off" className="max-w-2xl">
      <form onSubmit={runSearch} className="mb-3 flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search an address or landmark"
          className="min-h-9 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30"
        />
        <Button type="submit" variant="outline" size="sm" disabled={searching || query.trim().length < 3}>
          {searching ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
          <span className="ml-1">Search</span>
        </Button>
      </form>

      {searchError && <p className="mb-2 text-xs text-amber-600">{searchError}</p>}
      {results.length > 0 && (
        <ul className="mb-3 max-h-36 overflow-y-auto rounded-lg border border-slate-200 text-sm">
          {results.map((result) => (
            <li key={`${result.latitude},${result.longitude}`}>
              <button type="button" onClick={() => pickResult(result)} className="w-full px-3 py-2 text-left hover:bg-navy-50">
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mb-2 text-xs text-slate-500">Click the map to place the pin. It must be close to the route, ahead of where you board.</p>
      <RouteMap
        routeId={routeId}
        direction={direction}
        highlight={highlight}
        showStatus={false}
        onMapReady={handleMapReady}
        className="relative h-80 w-full overflow-hidden rounded-xl"
      />

      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">{error}</p>}
      {pin && !error && !busy && <p className="mt-2 text-xs text-emerald-700">Pin accepted. Review the timeline for your journey and fare.</p>}

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button type="button" variant="primary" size="sm" onClick={onConfirm} disabled={!pin || busy || Boolean(error)}>
          {busy ? 'Checking...' : 'Use this drop-off'}
        </Button>
      </div>
    </Modal>
  )
}
