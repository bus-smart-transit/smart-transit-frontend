import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  ZoomControl,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const LOCATIONS = {
  davao: [7.0736, 125.6128],
  'davao city': [7.0736, 125.6128],
  tagum: [7.4475, 125.8078],
  'tagum city': [7.4475, 125.8078],
  mati: [6.9551, 126.2165],
  'mati city': [6.9551, 126.2165],
  boston: [7.8617, 126.3689],
  carmen: [7.3606, 125.7068],
  malita: [6.4108, 125.6114],
  'santo tomas': [7.5336, 125.6239],
  'santo tomas davao del norte': [7.5336, 125.6239],
  panabo: [7.3081, 125.6842],
  digos: [6.7498, 125.3572],
  samal: [7.0731, 125.7089],
  'davao del sur': [6.7667, 125.3500],
}

const busIcon = L.divIcon({
  className: 'bus-location-icon',
  html: `
    <div
      style="
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: white;
        border: 3px solid #f59e0b;
        box-shadow: 0 3px 12px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
      "
    >
      <div
        style="
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: #f59e0b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        "
      >
        🚌
      </div>
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
  popupAnchor: [0, -25],
})

function normalizeLocation(name) {
  if (!name) return ''
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

function getLocationCoordinates(name) {
  const normalized = normalizeLocation(name)
  if (LOCATIONS[normalized]) {
    return LOCATIONS[normalized]
  }
  const key = Object.keys(LOCATIONS).find(
    (location) => normalized.includes(location) || location.includes(normalized),
  )
  if (key) {
    return LOCATIONS[key]
  }
  return null
}

function getTripLocations(trip) {
  if (trip.origin && trip.destination) {
    return {
      originName: trip.origin,
      destinationName: trip.destination,
      origin: getLocationCoordinates(trip.origin),
      destination: getLocationCoordinates(trip.destination),
    }
  }

  if (trip.route) {
    const parts = trip.route.split(/\s[-–—]\s/)

    if (parts.length >= 2) {
      const originName = parts[0].trim()
      const destinationName = parts.slice(1).join(' - ').trim()

      return {
        originName,
        destinationName,
        origin: getLocationCoordinates(originName),
        destination: getLocationCoordinates(destinationName),
      }
    }
  }

  return {
    originName: 'Unknown',
    destinationName: 'Unknown',
    origin: null,
    destination: null,
  }
}

function getPointAlongRoute(route, progress) {
  if (!route || route.length === 0) {
    return null
  }
  if (route.length === 1) {
    return route[0]
  }

  const safeProgress = Math.max(0, Math.min(1, Number(progress) || 0))
  const distances = []
  let totalDistance = 0

  for (let i = 0; i < route.length - 1; i++) {
    const start = route[i]
    const end = route[i + 1]
    const distance = Math.sqrt(
      Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2),
    )
    distances.push(distance)
    totalDistance += distance
  }

  const targetDistance = totalDistance * safeProgress
  let accumulatedDistance = 0

  for (let i = 0; i < distances.length; i++) {
    const segmentDistance = distances[i]

    if (accumulatedDistance + segmentDistance >= targetDistance) {
      const distanceIntoSegment = targetDistance - accumulatedDistance
      const segmentProgress =
        segmentDistance === 0 ? 0 : distanceIntoSegment / segmentDistance

      const start = route[i]
      const end = route[i + 1]

      return [
        start[0] + (end[0] - start[0]) * segmentProgress,
        start[1] + (end[1] - start[1]) * segmentProgress,
      ]
    }

    accumulatedDistance += segmentDistance
  }

  return route[route.length - 1]
}

function getCompletedRoute(route, progress) {
  if (!route || route.length === 0) {
    return []
  }
  if (route.length === 1) {
    return route
  }

  const safeProgress = Math.max(0, Math.min(1, Number(progress) || 0))

  if (safeProgress <= 0) {
    return [route[0]]
  }
  if (safeProgress >= 1) {
    return route
  }

  const distances = []
  let totalDistance = 0

  for (let i = 0; i < route.length - 1; i++) {
    const start = route[i]
    const end = route[i + 1]
    const distance = Math.sqrt(
      Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2),
    )
    distances.push(distance)
    totalDistance += distance
  }

  const targetDistance = totalDistance * safeProgress
  let accumulatedDistance = 0
  const completed = [route[0]]

  for (let i = 0; i < distances.length; i++) {
    const segmentDistance = distances[i]

    if (accumulatedDistance + segmentDistance >= targetDistance) {
      const distanceIntoSegment = targetDistance - accumulatedDistance
      const segmentProgress =
        segmentDistance === 0 ? 0 : distanceIntoSegment / segmentDistance

      const start = route[i]
      const end = route[i + 1]

      completed.push([
        start[0] + (end[0] - start[0]) * segmentProgress,
        start[1] + (end[1] - start[1]) * segmentProgress,
      ])

      break
    }

    completed.push(route[i + 1])
    accumulatedDistance += segmentDistance
  }

  return completed
}

function MapUpdater({ position }) {
  const map = useMap()

  useEffect(() => {
    if (!position) return
    map.panTo(position, { animate: true, duration: 0.8 })
  }, [map, position])

  return null
}

function TrackingRow({ trip, active, onSelect }) {
  const progress = Math.max(0, Math.min(1, Number(trip.progress) || 0))

  return (
    <article
      onClick={() => onSelect?.(trip)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onSelect) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(trip)
        }
      }}
      className={`rounded-2xl bg-[#0f1729] border border-white/5 px-3 py-2 shadow-sm transition ${
        onSelect ? 'cursor-pointer hover:bg-white/[0.03]' : ''
      } ${active ? 'ring-2 ring-[#f59e0b]' : ''}`}
    >
      <div className="mb-1 flex items-center justify-between text-[0.95rem] text-gray-300">
        <span>{trip.route}</span>
        <span>{trip.busId}</span>
        <span className="text-sm font-semibold text-[#3b82f6]">{trip.status}</span>
      </div>

      <div className="h-2 rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-[#3b82f6]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </article>
  )
}

const LIVE_GPS_ZOOM = 14

export default function FleetMapView({ selectedTrip, fleetTrips, onBack }) {
  const mapRef = useRef(null)
  const [liveTrips, setLiveTrips] = useState(fleetTrips)

  useEffect(() => {
    setLiveTrips(fleetTrips)
  }, [fleetTrips])

  const [activeTripId, setActiveTripId] = useState(selectedTrip.busId)

  useEffect(() => {
    setActiveTripId(selectedTrip.busId)
  }, [selectedTrip.busId])

  const activeTrip = useMemo(
    () => liveTrips.find((trip) => trip.busId === activeTripId) || selectedTrip,
    [liveTrips, activeTripId, selectedTrip],
  )

  const tripLocations = useMemo(() => getTripLocations(activeTrip), [activeTrip])

  const { originName, destinationName, origin, destination } = tripLocations

  const otherTrips = useMemo(
    () => liveTrips.filter((trip) => trip.busId !== activeTrip.busId),
    [liveTrips, activeTrip.busId],
  )

  const [roadRoute, setRoadRoute] = useState([])
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadRoadRoute() {
      if (!origin || !destination) {
        setRoadRoute([])
        setRouteError(true)
        setRouteLoading(false)
        return
      }

      setRouteLoading(true)
      setRouteError(false)
      setRoadRoute([])

      try {
        const start = `${origin[1]},${origin[0]}`
        const end = `${destination[1]},${destination[0]}`

        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${start};${end}` +
          `?overview=full&geometries=geojson`

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error('OSRM request failed')
        }

        const data = await response.json()

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
          throw new Error('No road route found')
        }

        const coordinates = data.routes[0].geometry.coordinates.map(
          ([longitude, latitude]) => [latitude, longitude],
        )

        if (!cancelled) {
          setRoadRoute(coordinates)
        }
      } catch (error) {
        console.error('Unable to load road route:', error)

        if (!cancelled) {
          setRouteError(true)
          setRoadRoute([])
        }
      } finally {
        if (!cancelled) {
          setRouteLoading(false)
        }
      }
    }

    loadRoadRoute()

    return () => {
      cancelled = true
    }
  }, [origin, destination])

  const busPosition = useMemo(
    () => getPointAlongRoute(roadRoute, activeTrip.progress),
    [roadRoute, activeTrip.progress],
  )

  const completedRoute = useMemo(
    () => getCompletedRoute(roadRoute, activeTrip.progress),
    [roadRoute, activeTrip.progress],
  )

  const mapCenter = origin || [7.0736, 125.6128]

  const handleLiveGpsClick = () => {
    if (!mapRef.current || !busPosition) return
    mapRef.current.flyTo(busPosition, LIVE_GPS_ZOOM, { animate: true, duration: 1 })
  }

  return (
    <section className="rounded-2xl border border-white/5 bg-[#0a0e1a] p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0f1729] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#1a2540] border border-white/5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2.2fr_1fr]">
        <div className="relative h-[500px] overflow-hidden rounded-xl border border-white/5">
          <MapContainer
            ref={mapRef}
            center={mapCenter}
            zoom={10}
            scrollWheelZoom={true}
            zoomControl={false}
            className="h-full w-full"
          >
            <ZoomControl position="topright" />

            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {!routeLoading && roadRoute.length > 1 && (
              <Polyline
                positions={roadRoute}
                pathOptions={{
                  color: '#f6c66b',
                  weight: 7,
                  opacity: 0.75,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}

            {!routeLoading && completedRoute.length > 0 && (
              <Polyline
                positions={completedRoute}
                pathOptions={{
                  color: '#f59e0b',
                  weight: 7,
                  opacity: 1,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}

            {origin && (
              <CircleMarker
                center={origin}
                radius={9}
                pathOptions={{
                  color: '#0a0e1a',
                  weight: 3,
                  fillColor: '#3b82f6',
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{originName}</strong>
                    <br />
                    Departure
                  </div>
                </Popup>
              </CircleMarker>
            )}

            {destination && (
              <CircleMarker
                center={destination}
                radius={9}
                pathOptions={{
                  color: '#0a0e1a',
                  weight: 3,
                  fillColor: '#16a34a',
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{destinationName}</strong>
                    <br />
                    Destination
                  </div>
                </Popup>
              </CircleMarker>
            )}

            {!routeLoading && busPosition && (
              <Marker position={busPosition} icon={busIcon} zIndexOffset={1000}>
                <Popup>
                  <div className="min-w-[180px] text-sm">
                    <div className="mb-2 text-base font-bold">🚌 {activeTrip.busId}</div>
                    <div>
                      <strong>Departure:</strong> {originName}
                    </div>
                    <div>
                      <strong>Destination:</strong> {destinationName}
                    </div>
                    <div>
                      <strong>Status:</strong> {activeTrip.status}
                    </div>
                    <div className="mt-1 font-semibold text-orange-500">
                      Progress: {Math.round(Number(activeTrip.progress) * 100)}%
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {routeLoading && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-[#0a0e1a]/70">
              <div className="rounded-xl bg-[#0f1729] px-5 py-3 text-sm font-semibold text-white shadow-lg border border-white/5">
                Loading road route...
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleLiveGpsClick}
            disabled={!busPosition}
            className="absolute left-3 top-3 z-[1000] flex items-center gap-2 rounded-full bg-[#0f1729] px-3 py-2 text-sm font-semibold text-white shadow-md border border-white/5 transition hover:bg-[#1a2540] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                activeTrip.status === 'Ongoing' ? 'animate-pulse bg-green-500' : 'bg-gray-500'
              }`}
            />
            {activeTrip.status === 'Ongoing' ? 'Live GPS' : activeTrip.status}
          </button>

          <div className="absolute bottom-3 left-3 z-[1000] rounded-xl bg-[#0f1729] px-3 py-2 shadow-md border border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚌</span>
              <div>
                <div className="text-xs text-gray-400">Current Bus</div>
                <div className="font-bold text-white">{activeTrip.busId}</div>
              </div>
            </div>
          </div>

          <div className="absolute right-3 bottom-3 z-[1000] rounded-xl bg-[#0f1729] px-3 py-2 shadow-md border border-white/5">
            <div className="text-xs text-gray-400">Route</div>
            <div className="font-semibold text-white">
              {originName}
              {' → '}
              {destinationName}
            </div>
          </div>

          {routeError && (
            <div className="absolute right-3 top-3 z-[1000] max-w-[220px] rounded-lg bg-[#0f1729] px-3 py-2 text-xs text-red-400 shadow border border-white/5">
              Unable to load the road route for this trip.
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-white/5 bg-[#0a0e1a] p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[2rem] font-bold text-white">Live Tracking</h3>
            <span className="rounded-full bg-white/5 px-5 py-1 text-xl font-semibold text-gray-300">
              Status
            </span>
          </div>

          <div className="mb-6">
            <TrackingRow trip={activeTrip} active />
          </div>

          <h4 className="mb-3 text-[2rem] font-bold text-white">Other Trips</h4>

          <div className="space-y-3">
            {otherTrips.map((trip) => (
              <TrackingRow
                key={`${trip.route}-${trip.busId}`}
                trip={trip}
                onSelect={(selected) => setActiveTripId(selected.busId)}
              />
            ))}
          </div>
        </aside>
      </div>
    </section>
  )
}