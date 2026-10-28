import { useEffect, useMemo, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { loadMapLib } from './mapDependencies'
import { fetchRouteMapData } from '../../services/routeMapService'
import { computeVehicleState } from '../../utils/vehicleState'
import { haversineM, lerp } from '../../utils/geo'
import { getRegion, regionMapBounds } from '../../services/regionService'
import { MAP_CONFIG } from '../../config/mapConfig'
import { fitToPoints, renderRouteLayers } from './routeLayers'
import { createBusMarkerElement } from './mapMarkers'
import { watchMapHealth } from './mapHealth'
import { congestionTransformRequest } from './congestionLayer'
import MapUnavailable from './MapUnavailable'


const STATE_STYLE = {
  ok: { color: '#0d9488', chip: 'bg-emerald-600 text-white' },
  stale: { color: '#94a3b8', chip: 'bg-amber-500 text-slate-900' },
  off_route: { color: '#f59e0b', chip: 'bg-amber-500 text-slate-900' },
  weak: { color: '#94a3b8', chip: 'bg-amber-500 text-slate-900' },
  no_gps: { color: '#94a3b8', chip: 'bg-slate-600 text-white' },
}

const NO_STOPS = []

/**
 * The one map layer shared by Passenger, Driver and Operator (Batch 24, 1.4).
 *
 * - Route line = canonical server geometry for the route + leg direction. No
 *   line is ever synthesised from stops or GPS points; if geometry has not
 *   been generated the map says so instead of drawing a misleading path.
 * - Stops are MapLibre layers (circle + sequence number); the name shows on
 *   tap only, so labels can never overlap or clip. (Layer code lives in
 *   routeLayers.js and is reused by the passenger MapView.)
 * - The vehicle is a layer too, projected onto the route, moved with
 *   interpolation, and replaced by an explicit state (no GPS / weak / stale /
 *   not on route) whenever the position cannot be trusted.
 *
 * vehicle: { latitude, longitude, accuracy?, recordedAt?, routePosition? }
 * highlight: { fromStopId, toStopId } dims everything outside the journey.
 * acknowledgedStopIds: stop ids already passed on this leg.
 * onMapReady(map, maplibregl): lets a host add its own overlays.
 *
 * A map never fails silently (Batch 25): if the basemap cannot be drawn the
 * box says "Map unavailable" with a Retry button (which remounts the map), and
 * if route data fails the base map still renders with a message on top.
 */
export default function RouteMap(props) {
  const [attempt, setAttempt] = useState(0)
  return <RouteMapInner key={attempt} {...props} onRetry={() => setAttempt((n) => n + 1)} />
}

function RouteMapInner({
  routeId,
  direction = 'outbound',
  vehicle = null,
  highlight = null,
  acknowledgedStopIds = NO_STOPS,
  showStatus = true,
  onVehicleState,
  onRouteStatus,
  onRouteData,
  onMapReady,
  onRetry,
  showStopOffsets = false,
  className = 'relative h-full min-h-64 w-full',
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const libRef = useRef(null)
  const onMapReadyRef = useRef(onMapReady)
  const fittedKeyRef = useRef(null)
  const currentCoordRef = useRef(null)
  // 2026-10-29: the bus is the app's bus icon (components/Map/mapMarkers), a MapLibre marker, not a dot layer.
  const busMarkerRef = useRef(null)
  const targetCoordRef = useRef(null)
  const animRef = useRef(null)

  const [mapReady, setMapReady] = useState(false)
  // { blocking, message } | null. Blocking = the basemap could not be drawn.
  const [mapIssue, setMapIssue] = useState(null)
  const [routeAttempt, setRouteAttempt] = useState(0)
  const [fetched, setFetched] = useState({ key: null, data: null, error: '' })
  const [nowMs, setNowMs] = useState(() => Date.now())

  const requestKey = routeId ? `${routeId}:${direction}` : null
  const routeData = fetched.key === requestKey ? fetched.data : null
  const loadError = fetched.key === requestKey ? fetched.error : ''

  const routeCoords = useMemo(() => routeData?.geometry?.coordinates || [], [routeData])
  const displayedRouteData = useMemo(() => {
    if (!showStopOffsets || !routeData) return routeData

    return {
      ...routeData,
      stops: routeData.stops.map((stop) => ({
        ...stop,
        latitude: stop.sourceLatitude ?? stop.latitude,
        longitude: stop.sourceLongitude ?? stop.longitude,
      })),
    }
  }, [routeData, showStopOffsets])

  const vehicleState = useMemo(
    () => computeVehicleState({ vehicle, routeCoords, nowMs }),
    [vehicle, routeCoords, nowMs],
  )

  useEffect(() => {
    onVehicleState?.(vehicleState)
  }, [vehicleState, onVehicleState])

  // 'idle' (no route) | 'loading' | 'ready' (geometry) | 'no_geometry' | 'error'
  const routeStatus = !requestKey
    ? 'idle'
    : loadError
      ? 'error'
      : !routeData
        ? 'loading'
        : routeData.geometry ? 'ready' : 'no_geometry'

  useEffect(() => {
    onRouteStatus?.(routeStatus)
  }, [routeStatus, onRouteStatus])

  useEffect(() => {
    onRouteData?.(routeData)
  }, [routeData, onRouteData])

  // Re-evaluate freshness without needing a new position.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 15000)
    return () => clearInterval(id)
  }, [])

  // 1. Map instance.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return undefined
    let cancelled = false
    let stopWatching = null

    ;(async () => {
      try {
        // Default view = the configured region; once a route is in context the
        // map fits that route's bounds instead (step 3 below).
        const [{ default: maplibregl }, region] = await Promise.all([loadMapLib(), getRegion()])
        if (cancelled || !containerRef.current) return
        libRef.current = maplibregl
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: MAP_CONFIG.basemapStyleUrl,
          bounds: regionMapBounds(region),
          fitBoundsOptions: { padding: 16 },
          // Only the driver's congestion tiles (our server) get the staff token; every other request is untouched.
          transformRequest: congestionTransformRequest,
        })
        mapRef.current = map
        stopWatching = watchMapHealth(map, {
          onFail: (reason) => setMapIssue({
            blocking: true,
            message: reason === 'timeout'
              ? 'The base map took too long to load. Check your connection and try again.'
              : 'The base map could not be loaded. Check your connection and try again.',
          }),
          onTrouble: () => setMapIssue({ blocking: false, message: 'Some map tiles could not be loaded.' }),
          onRecover: () => setMapIssue(null),
        })
        map.once('load', () => {
          if (cancelled) return
          setMapReady(true)
          onMapReadyRef.current?.(map, maplibregl)
        })
      } catch {
        if (!cancelled) {
          setMapIssue({
            blocking: true,
            message: 'The map could not be started (region settings or graphics support unavailable).',
          })
        }
      }
    })()

    return () => {
      cancelled = true
      stopWatching?.()
      if (animRef.current) cancelAnimationFrame(animRef.current)
      animRef.current = null
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      setMapReady(false)
    }
  }, [])

  // 2. Canonical geometry + stops for this route and leg direction.
  useEffect(() => {
    if (!requestKey) return undefined
    let cancelled = false
    fetchRouteMapData(routeId, direction)
      .then((data) => {
        if (!cancelled) setFetched({ key: requestKey, data, error: '' })
      })
      .catch(() => {
        if (!cancelled) setFetched({ key: requestKey, data: null, error: 'Route data could not be loaded.' })
      })
    return () => {
      cancelled = true
    }
  }, [requestKey, routeId, direction, routeAttempt])

  // 3. Route line, journey segment and stop markers.
  useEffect(() => {
    const map = mapRef.current
    const maplibregl = libRef.current
    if (!mapReady || !map || !maplibregl) return

    const points = renderRouteLayers(map, maplibregl, displayedRouteData, { highlight, acknowledgedStopIds, showStopOffsets })

    const key = `${routeData?.routeId || 'none'}:${routeData?.direction || ''}:${points.length}`
    if (fittedKeyRef.current !== key && points.length > 0) {
      fitToPoints(map, maplibregl, points)
      fittedKeyRef.current = key
    }
  }, [mapReady, displayedRouteData, routeData?.direction, routeData?.routeId, highlight, acknowledgedStopIds, showStopOffsets])

  // 4. Vehicle marker with interpolated movement.
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return undefined

    const maplibregl = libRef.current
    const color = (STATE_STYLE[vehicleState.state] || STATE_STYLE.no_gps).color
    const heading = Number.isFinite(Number(vehicle?.heading)) && vehicle?.heading !== null ? Number(vehicle.heading) : null
    const paint = (coord) => {
      if (!coord) {
        busMarkerRef.current?.marker.remove()
        busMarkerRef.current = null
        return
      }
      if (!busMarkerRef.current && maplibregl) {
        const icon = createBusMarkerElement({ color, heading, title: 'Bus position' })
        busMarkerRef.current = { ...icon, marker: new maplibregl.Marker({ element: icon.element }).setLngLat(coord).addTo(map) }
      }
      if (!busMarkerRef.current) return
      busMarkerRef.current.setColor(color)
      busMarkerRef.current.setHeading(heading)
      busMarkerRef.current.marker.setLngLat(coord)
    }

    if (animRef.current) cancelAnimationFrame(animRef.current)
    animRef.current = null

    const target = vehicleState.coord
    targetCoordRef.current = target
    if (!target) {
      currentCoordRef.current = null
      paint(null)
      return undefined
    }

    const current = currentCoordRef.current
    // First fix, or a jump too big to glide across: place directly.
    if (!current || haversineM(current[1], current[0], target[1], target[0]) > 2000) {
      currentCoordRef.current = target
      paint(target)
    } else {
      const step = () => {
        const from = currentCoordRef.current
        const to = targetCoordRef.current
        if (!from || !to) return
        const next = [lerp(from[0], to[0], 0.18), lerp(from[1], to[1], 0.18)]
        const remaining = haversineM(next[1], next[0], to[1], to[0])
        currentCoordRef.current = remaining > 2 ? next : to
        paint(currentCoordRef.current)
        if (remaining > 2) animRef.current = requestAnimationFrame(step)
      }
      animRef.current = requestAnimationFrame(step)
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
  }, [mapReady, vehicleState, vehicle?.heading])

  // Remove the bus marker with the map.
  useEffect(() => () => {
    busMarkerRef.current?.marker.remove()
    busMarkerRef.current = null
  }, [])

  const geometryMissing = routeData && !routeData.geometry
  const style = STATE_STYLE[vehicleState.state] || STATE_STYLE.no_gps

  return (
    <div className={className}>
      <div className="absolute inset-0">
        {/* The map owns this element: MapLibre's stylesheet forces position:relative on
            it (unlayered CSS beats Tailwind v4 utilities), so it is sized with h-full/w-full
            inside an absolutely positioned wrapper, never with absolute/inset on itself. */}
        <div ref={containerRef} className="h-full w-full" />
      </div>
      {showStatus && (
        <div className={`pointer-events-none absolute left-3 top-3 max-w-[80%] rounded-full px-3 py-1 text-xs font-semibold shadow ${style.chip}`}>
          {vehicleState.label}
        </div>
      )}
      {geometryMissing && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg bg-slate-900/85 px-3 py-2 text-xs text-slate-100">
          {routeData.geometryStale
            ? 'Route path is out of date and being regenerated.'
            : 'Route path has not been generated yet; stops are shown without a line.'}
        </div>
      )}
      {loadError && (
        <div className="absolute inset-x-3 top-12 flex items-center justify-between gap-3 rounded-lg bg-red-600/90 px-3 py-2 text-xs text-white">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => {
              setFetched({ key: null, data: null, error: '' })
              setRouteAttempt((n) => n + 1)
            }}
            className="rounded-full bg-white/20 px-3 py-1 font-semibold hover:bg-white/30"
          >
            Retry
          </button>
        </div>
      )}
      {mapIssue && (
        <MapUnavailable blocking={mapIssue.blocking} message={mapIssue.message} onRetry={onRetry} />
      )}
    </div>
  )
}
