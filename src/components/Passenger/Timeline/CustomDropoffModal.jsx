import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, Loader } from 'lucide-react'
import Modal from '../../ui/Modal'
import Button from '../../ui/Button'
import RouteMap from '../../Map/RouteMap'
import { readApiError, searchAddress } from '../../../services/bookingService'
import { fetchRouteMapData } from '../../../services/routeMapService'
import { areaToGeoJson, pinFeedback, pointKindLabel } from '../../../utils/dropoffRestrictions'

const PIN_COLOR = '#f59e0b'
const POINT_COLOR = '#0f766e'
const POINT_SELECTED_COLOR = '#f59e0b'
const AREA_SOURCE = 'restricted-areas'
const AREA_LAYER = 'restricted-areas-line'
const NONE = []

/**
 * D5 + Batch 28 Stage 3 (item 10): the drop-off modal, shared by the passenger booking page and the Chauffeur's cash
 * ticket. Two modes, both from the server (`options.mode`):
 *   free_pin           the passenger drops a pin (or picks an address), as before;
 *   designated_points  there is NO free pin: only the named points the server lists (ahead of the boarding point,
 *                      outside restricted areas) can be chosen, from the list or the map markers.
 * The restricted areas come from the server and are shaded on the map. A pin inside one is refused at once with a
 * message above the Confirm button, and Confirm stays off. That check is feedback only: the server re-validates the
 * choice (and a tampered request) and its answer is final.
 *
 * pin: { lat, lng, label?, pointId?, kind? } | null    onPinChange(pin)
 * options: the server's drop-off options for this trip and boarding point (null while loading / for older callers)
 */
export default function CustomDropoffModal({
  open,
  routeId,
  direction,
  highlight,
  pin,
  options = null,
  busy = false,
  error = '',
  boardingAlongM = null,
  onPinChange,
  onClose,
  onConfirm,
}) {
  const [mapHandle, setMapHandle] = useState(null)
  const [line, setLine] = useState(NONE)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const markerRef = useRef(null)
  const pointMarkersRef = useRef([])
  const onPinChangeRef = useRef(onPinChange)
  const designated = options?.mode === 'designated_points'
  const designatedRef = useRef(designated)
  const unavailable = Boolean(options) && options.available === false
  const areas = options?.restricted_areas ?? NONE
  const points = options?.designated_points ?? NONE
  const selectedPointId = pin?.pointId ?? null

  useEffect(() => {
    onPinChangeRef.current = onPinChange
    designatedRef.current = designated
  }, [onPinChange, designated])

  // The route line for this leg, only to give the pin its quick check (same cached fetch the map uses).
  useEffect(() => {
    let cancelled = false
    if (!open || !routeId) return undefined
    fetchRouteMapData(routeId, direction)
      .then((data) => { if (!cancelled) setLine(data?.geometry?.coordinates || NONE) })
      .catch(() => { if (!cancelled) setLine(NONE) })
    return () => { cancelled = true }
  }, [open, routeId, direction])

  // RouteMap gives us the live map once; wire the click-to-pin overlay on it (not in designated-points mode).
  const handleMapReady = useCallback((map, maplibregl) => {
    map.getCanvas().style.cursor = designatedRef.current ? '' : 'crosshair'
    map.on('click', (event) => {
      if (designatedRef.current) return
      onPinChangeRef.current?.({ lat: event.lngLat.lat, lng: event.lngLat.lng, label: '' })
    })
    setMapHandle({ map, maplibregl })
  }, [])

  // The amber pin (free-pin mode only; a designated point has its own marker).
  useEffect(() => {
    if (!mapHandle) return undefined
    const { map, maplibregl } = mapHandle
    if (!pin || pin.pointId != null) {
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

  // Shade the restricted route segments.
  useEffect(() => {
    if (!mapHandle) return undefined
    const { map } = mapHandle
    const apply = () => {
      const collection = { type: 'FeatureCollection', features: areas.filter((area) => (area.path || []).length > 1).map(areaToGeoJson) }
      const source = map.getSource(AREA_SOURCE)
      if (source) {
        source.setData(collection)
      } else {
        map.addSource(AREA_SOURCE, { type: 'geojson', data: collection })
        map.addLayer({ id: AREA_LAYER, type: 'line', source: AREA_SOURCE, paint: { 'line-color': '#dc2626', 'line-width': 10, 'line-opacity': 0.45 } })
      }
    }
    try {
      if (map.isStyleLoaded()) apply()
      else map.once('load', apply)
    } catch {
      // The map is still starting; the shading appears on the next change.
    }
    return undefined
  }, [mapHandle, areas])

  // Markers for the designated points (clicking one chooses it).
  useEffect(() => {
    if (!mapHandle) return undefined
    const { map, maplibregl } = mapHandle
    pointMarkersRef.current.forEach((marker) => marker.remove())
    pointMarkersRef.current = []
    if (!designated) return undefined

    pointMarkersRef.current = points.map((point) => {
      const marker = new maplibregl.Marker({ color: point.id === selectedPointId ? POINT_SELECTED_COLOR : POINT_COLOR })
        .setLngLat([point.longitude, point.latitude])
        .addTo(map)
      marker.getElement().addEventListener('click', (event) => {
        event.stopPropagation()
        onPinChangeRef.current?.({ lat: point.latitude, lng: point.longitude, label: point.name, pointId: point.id, kind: point.kind })
      })
      marker.getElement().setAttribute('aria-label', `Drop-off point ${point.name}`)
      return marker
    })
    return undefined
  }, [mapHandle, designated, points, selectedPointId])

  useEffect(() => () => {
    markerRef.current?.remove()
    markerRef.current = null
    pointMarkersRef.current.forEach((marker) => marker.remove())
    pointMarkersRef.current = []
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

  const pickPoint = (point) => onPinChange({ lat: point.latitude, lng: point.longitude, label: point.name, pointId: point.id, kind: point.kind })

  // Quick check on this device. The server's answer (error) always wins and the message says so.
  const localError = designated ? '' : pinFeedback({ pin, lineCoords: line, areas, boardingAlongM })
  const serverError = !localError && pin ? error : ''
  const message = localError || serverError
  const blocked = Boolean(message)

  return (
    <Modal open={open} onClose={onClose} title={designated ? 'Choose your drop-off point' : 'Pin your drop-off'} className="max-w-2xl">
      {unavailable ? (
        <p data-testid="dropoff-unavailable" className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
          {options.reason || 'Custom drop-off is not available for this trip.'} Official stops are still available.
        </p>
      ) : designated ? (
        <>
          <p className="mb-2 text-xs text-slate-500">This route lets you get off at the points below, or at an official stop. Pick one from the list or on the map.</p>
          <ul data-testid="designated-points" className="mb-3 max-h-40 overflow-y-auto rounded-lg border border-slate-200 text-sm">
            {points.map((point) => (
              <li key={point.id}>
                <label className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-navy-50">
                  <input type="radio" name="dropoff-point" checked={selectedPointId === point.id} onChange={() => pickPoint(point)} className="accent-navy-800" />
                  <span className="font-medium text-navy-950">{point.name}</span>
                  <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[0.65rem] font-semibold text-navy-700">{pointKindLabel(point.kind)}</span>
                  {point.municipality && <span className="text-xs text-slate-400">{point.municipality}</span>}
                </label>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
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

          <p className="mb-2 text-xs text-slate-500">Click the map to place the pin. It must be close to the route, ahead of where you board, and outside the shaded areas.</p>
        </>
      )}

      {areas.length > 0 && (
        <p data-testid="restricted-legend" className="mb-2 flex items-center gap-2 text-xs text-slate-600">
          <span className="inline-block h-2 w-6 rounded bg-red-600/50" aria-hidden="true" />
          No custom drop-off in: {areas.map((area) => area.name).join(', ')}. Official stops there work as usual.
        </p>
      )}
      {options?.needs_review?.length > 0 && (
        <p data-testid="restriction-review-warning" className="mb-2 text-xs text-amber-700">
          A restricted area is being reviewed, so custom drop-off is paused on this route. Official stops are not affected.
        </p>
      )}

      <RouteMap
        routeId={routeId}
        direction={direction}
        highlight={highlight}
        showStatus={false}
        onMapReady={handleMapReady}
        className="relative h-72 w-full overflow-hidden rounded-xl"
      />

      {/* Kept together at the bottom of the scrolling body so the message and the button stay in view above a phone keyboard. */}
      <div className="sticky bottom-0 -mx-4 mt-3 bg-white px-4 pb-1 pt-2 sm:-mx-6 sm:px-6">
        {message && (
          <div role="alert" data-testid="dropoff-message" className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
            {message}
            <span className="mt-0.5 block font-normal text-red-600">
              {localError
                ? 'This is a quick check on your device; the booking service checks again and its answer is final.'
                : 'The booking service checks every drop-off and its answer is final.'}
            </span>
          </div>
        )}
        {pin && !message && !busy && !unavailable && <p className="mb-2 text-xs text-emerald-700">{pin.pointId != null ? `${pin.label} selected. Review the timeline for your journey and fare.` : 'Pin accepted. Review the timeline for your journey and fare.'}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          {!unavailable && (
            <Button type="button" variant="primary" size="sm" onClick={onConfirm} disabled={!pin || busy || blocked}>
              {busy ? 'Checking...' : designated ? 'Use this drop-off point' : 'Use this drop-off'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
