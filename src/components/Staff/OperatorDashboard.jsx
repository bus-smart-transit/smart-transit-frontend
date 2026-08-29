import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StaffService from '../../api/StaffService/StaffService'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bus,
  Calendar,
  Check,
  Clock,
  LayoutDashboard,
  LogOut,
  Minus,
  MapPin,
  PieChart,
  Plus,
  Settings,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  ZoomControl,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'


async function safeJsonFetch(url, options) {
  let res
  try {
    res = await fetch(url, options)
  } catch (networkErr) {
    throw new Error(
      `Could not reach ${url}. Check your connection or that the server is running.`,
      { cause: networkErr },
    )
  }

  const contentType = res.headers.get('content-type') || ''

  if (!res.ok) {
    throw new Error(`Request to ${url} failed (status ${res.status}).`)
  }

  if (!contentType.includes('application/json')) {
    throw new Error(`Request to ${url} did not return JSON. The endpoint may not exist yet.`)
  }

  try {
    return await res.json()
  } catch (parseErr) {
    throw new Error(`Request to ${url} returned invalid JSON.`, { cause: parseErr })
  }
}

/* =============================================================================
   Sidebar
   ========================================================================== */

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'fleets', label: 'Fleets', icon: Bus },
  { id: 'routes', label: 'Routes', icon: MapPin },
  { id: 'schedule', label: 'Schedule', icon: Clock },
  { id: 'reports', label: 'Financial Reports', icon: PieChart },
  { id: 'staff', label: 'Staff', icon: Users },
]

function Sidebar({ activeTab, onTabChange }) {
  const settingsActive = activeTab === 'settings'

  return (
    <aside className="flex w-[220px] shrink-0 flex-col bg-[#0a0e1a] px-4 py-8 border-r border-white/5">
      <div className="mb-10 flex justify-center">
        <Bus className="h-14 w-14 text-white" strokeWidth={1.5} />
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              {active && (
                <span className="absolute -left-4 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r bg-[#3b82f6]" />
              )}
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
              {label}
            </button>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={() => onTabChange('settings')}
        className={`relative mt-auto flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
          settingsActive
            ? 'bg-white/10 text-white'
            : 'text-white/70 hover:bg-white/5 hover:text-white'
        }`}
      >
        {settingsActive && (
          <span className="absolute -left-4 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r bg-[#3b82f6]" />
        )}
        <Settings className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        Settings
      </button>
    </aside>
  )
}

/* =============================================================================
   Account Settings
   ========================================================================== */

function AccountSettings({ user, onLogout }) {
  const displayName = user?.name ?? 'Admin User'
  const displayEmail = user?.email ?? 'admin@example.com'

  return (
    <>
      <header className="rounded-xl bg-[#0f1729] px-8 py-5 shadow-sm border border-white/5">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </header>

      <section className="rounded-xl bg-[#0f1729] p-6 shadow-sm border border-white/5">
        <h2 className="mb-5 text-lg font-bold text-white">Account</h2>

        <div className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.03] p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#3b82f6]/15">
            <User className="h-6 w-6 text-[#3b82f6]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{displayName}</p>
            <p className="text-sm text-gray-400">{displayEmail}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-[#0f1729] p-6 shadow-sm border border-white/5">
        <h2 className="mb-5 text-lg font-bold text-white">Security</h2>

        <div className="mb-4 flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-4">
          <ShieldCheck className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-white">Session</p>
            <p className="text-sm text-gray-400">
              You're currently signed in on this device.
            </p>
          </div>
        </div>

        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-lg transition font-medium"
          onClick={onLogout}
        >
          <LogOut size={18} /> Sign Out
        </button>
      </section>
    </>
  )
}

/* =============================================================================
   Dashboard Header
   ========================================================================== */

const statusStyles = {
  Arrived: 'text-gray-300',
  Ongoing: 'text-blue-400',
  Upcoming: 'text-gray-300',
}

function StatCard({ label, value, highlight = false }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-[#0f1729] px-6 py-8 shadow-sm border border-white/5">
      <p className="mb-2 text-sm text-gray-400">{label}</p>
      <p
        className={`text-xl font-semibold ${
          highlight ? 'text-[#3b82f6]' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function TripsTable({ trips }) {
  return (
    <section className="rounded-xl bg-[#0f1729] p-6 shadow-sm border border-white/5">
      <h2 className="mb-5 text-lg font-bold text-white">Trips Today</h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-white/5">
              <th className="px-4 py-3 text-center font-semibold text-gray-300">
                Bus ID
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-300">
                Route
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-300">
                Departure Time
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-300">
                Type Of Service
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-300">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {trips.map((trip, index) => (
              <tr
                key={`${trip.busId}-${index}`}
                className={index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.03]'}
              >
                <td className="px-4 py-3 text-center text-gray-300">
                  {trip.busId}
                </td>
                <td className="px-4 py-3 text-left text-gray-300">
                  {trip.route}
                </td>
                <td className="px-4 py-3 text-center text-gray-300">
                  {trip.departureTime}
                </td>
                <td className="px-4 py-3 text-center text-gray-300">
                  {trip.serviceType}
                </td>
                <td
                  className={`px-4 py-3 text-center font-medium ${statusStyles[trip.status]}`}
                >
                  {trip.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function DashboardHeader({
  title = 'Dashboard',
  stats = [],
  trips = [],
  isDashboardView = false,
}) {
  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <>
      <header className="flex items-center justify-between rounded-xl bg-[#0f1729] px-8 py-5 shadow-sm border border-white/5">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="text-sm text-gray-400">{formattedDate}</p>
      </header>

      {isDashboardView ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

          <TripsTable trips={trips} />
        </>
      ) : null}
    </>
  )
}

/* =============================================================================
   Fleets Panel + Fleet Map View
   ========================================================================== */

function FleetTripCard({ trip, onViewMap }) {
  return (
    <article className="rounded-2xl bg-[#0f1729] p-3 shadow-sm border border-white/5">
      <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
        <Bus className="h-9 w-9 text-[#3b82f6]" strokeWidth={1.75} />
        <div className="text-white">
          <p className="text-xl font-semibold leading-tight">{trip.route}</p>
          <p className="text-sm text-gray-400">{trip.busId}</p>
          <p className="text-sm text-gray-400">{trip.departureTime}</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-1 flex justify-end">
          <span className="text-xs font-semibold text-[#3b82f6]">{trip.status}</span>
        </div>
        <div className="h-4 rounded-full bg-white/5 p-0.5">
          <div
            className="h-full rounded-full bg-[#3b82f6]"
            style={{ width: `${trip.progress * 100}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onViewMap(trip)}
        className="w-full rounded-full bg-[#1a2540] py-1.5 text-lg font-semibold text-white transition hover:bg-[#233258]"
      >
        View Map
      </button>
    </article>
  )
}

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

function FleetMapView({ selectedTrip, fleetTrips, onBack }) {
  const mapRef = useRef(null)
  const liveTrips = fleetTrips

  const [activeTripId, setActiveTripId] = useState(selectedTrip.busId)
  const [syncedTripId, setSyncedTripId] = useState(selectedTrip.busId)
  if (selectedTrip.busId !== syncedTripId) {
    setSyncedTripId(selectedTrip.busId)
    setActiveTripId(selectedTrip.busId)
  }

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

function FleetsPanel({ fleetTrips }) {
  const [selectedTrip, setSelectedTrip] = useState(null)

  if (selectedTrip) {
    return (
      <FleetMapView
        selectedTrip={selectedTrip}
        fleetTrips={fleetTrips}
        onBack={() => setSelectedTrip(null)}
      />
    )
  }

  return (
    <section className="rounded-2xl border border-white/5 bg-[#0a0e1a] p-4 shadow-sm">
      <h2 className="mb-4 text-[2rem] font-bold text-white">Fleets Trips</h2>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {fleetTrips.map((trip) => (
          <FleetTripCard
            key={`${trip.route}-${trip.busId}`}
            trip={trip}
            onViewMap={setSelectedTrip}
          />
        ))}
      </div>
    </section>
  )
}

/* =============================================================================
   Reports Panel (Financial Auditing)
   ========================================================================== */

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function CalendarDatePicker({ selectedDate, onSelect }) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  )

  const formattedDate = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0
  ).getDate()
  const firstWeekday = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth(),
    1
  ).getDay()

  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const changeMonth = (delta) => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1))
  }

  const handleMonthChange = (event) => {
    setViewMonth(new Date(viewMonth.getFullYear(), Number(event.target.value), 1))
  }

  const handleYearChange = (event) => {
    setViewMonth(new Date(Number(event.target.value), viewMonth.getMonth(), 1))
  }

  const pickDay = (day) => {
    const picked = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
    onSelect(picked)
    setOpen(false)
  }

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/30 bg-white/5 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10"
      >
        <Calendar className="h-4 w-4 text-gray-400" />
        {formattedDate}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-white/10 bg-[#0f1729] p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="rounded-md px-2 py-1 text-sm text-gray-400 hover:bg-white/10 hover:text-white"
              >
                ‹
              </button>

              <div className="flex flex-1 items-center justify-center gap-1.5">
                <select
                  value={viewMonth.getMonth()}
                  onChange={handleMonthChange}
                  className="rounded-md border border-white/10 bg-[#1a2438] px-1.5 py-1 text-xs font-semibold text-white outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]"
                >
                  {MONTH_NAMES.map((name, index) => (
                    <option key={name} value={index} className="bg-[#1a2438]">
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={viewMonth.getFullYear()}
                  onChange={handleYearChange}
                  className="rounded-md border border-white/10 bg-[#1a2438] px-1.5 py-1 text-xs font-semibold text-white outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year} className="bg-[#1a2438]">
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="rounded-md px-2 py-1 text-sm text-gray-400 hover:bg-white/10 hover:text-white"
              >
                ›
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-500">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={`${d}-${i}`}>{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) return <span key={`empty-${i}`} />
                const cellDate = new Date(
                  viewMonth.getFullYear(),
                  viewMonth.getMonth(),
                  day
                )
                const isSelected = toDateKey(cellDate) === toDateKey(selectedDate)
                const isToday = toDateKey(cellDate) === toDateKey(new Date())
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => pickDay(day)}
                    className={`aspect-square rounded-md text-xs transition-colors ${
                      isSelected
                        ? 'bg-[#3b82f6] font-semibold text-white'
                        : isToday
                        ? 'border border-[#3b82f6]/50 text-gray-200'
                        : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ReportStatCard({ label, value }) {
  return (
    <article className="flex flex-col items-center justify-center rounded-xl bg-[#0f1729] px-6 py-8 shadow-sm border border-white/5">
      <p className="mb-2 text-sm text-gray-400">{label}</p>
      <p className="text-xl font-semibold text-white">{value}</p>
    </article>
  )
}

function ReportsPanel() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [financialRows, setFinancialRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadFinancialData() {
      setIsLoading(true)

      try {
        const data = await safeJsonFetch(`/api/trips?date=${toDateKey(selectedDate)}`)
        const rows = Array.isArray(data) ? data : data?.data ?? []

        if (!cancelled) {
          setFinancialRows(
            rows.map((row) => {
              const cashPayments = Number(row.cashPayments ?? row.cash_payments ?? 0)
              const digitalPayments = Number(row.digitalPayments ?? row.digital_payments ?? 0)
              return {
                busId: row.busId ?? row.bus_id ?? '—',
                route:
                  row.route ??
                  (row.departure && row.destination ? `${row.departure} - ${row.destination}` : '—'),
                serviceType: row.serviceType ?? row.service_type ?? '—',
                cashPayments,
                digitalPayments,
                totalRevenue: row.totalRevenue ?? row.total_revenue ?? cashPayments + digitalPayments,
                passengers: Number(row.passengers ?? row.passenger_count ?? 0),
              }
            }),
          )
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Unable to load financial data:', err)
          setFinancialRows([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadFinancialData()

    return () => {
      cancelled = true
    }
  }, [selectedDate])

  const financialStats = useMemo(() => {
    const cashPayments = financialRows.reduce((sum, row) => sum + row.cashPayments, 0)
    const digitalPayments = financialRows.reduce((sum, row) => sum + row.digitalPayments, 0)
    const totalPassengers = financialRows.reduce((sum, row) => sum + row.passengers, 0)
    const totalRevenue = cashPayments + digitalPayments

    const currency = (value) =>
      `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    return [
      { label: 'Cash Payments', value: currency(cashPayments) },
      { label: 'Digital Payments', value: currency(digitalPayments) },
      { label: 'Total Trips Profit', value: currency(totalRevenue) },
      { label: 'Total Passengers', value: `${totalPassengers} Passengers` },
    ]
  }, [financialRows])

  return (
    <>
      <header className="flex items-center justify-between rounded-xl bg-[#0f1729] px-8 py-5 shadow-sm border border-white/5">
        <h1 className="text-2xl font-bold text-white">Financial Auditing</h1>
        <CalendarDatePicker selectedDate={selectedDate} onSelect={setSelectedDate} />
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {financialStats.map((stat) => (
          <ReportStatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className="rounded-xl bg-[#0f1729] p-6 shadow-sm border border-white/5">
        <h2 className="mb-5 text-lg font-bold text-white">
          Trips Schedule —{' '}
          {selectedDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </h2>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-gray-400">Loading...</p>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-white/5">
                <th className="px-4 py-3 text-center font-semibold text-gray-300">Bus ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">Route</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Type Of Service
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Cash Payments
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Digital Payments
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Total Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {financialRows.map((row, index) => (
                <tr
                  key={`${row.busId}-${index}`}
                  className={index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.03]'}
                >
                  <td className="px-4 py-3 text-center text-gray-300">{row.busId}</td>
                  <td className="px-4 py-3 text-left text-gray-300">{row.route}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{row.serviceType}</td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    ₱{row.cashPayments.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    ₱{row.digitalPayments.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    ₱{row.totalRevenue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </section>
    </>
  )
}

/* =============================================================================
   Routes Panel (Analytical Reports)
   ========================================================================== */

function adherenceTone(value) {
  if (value >= 90) {
    return {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      bar: 'bg-emerald-500',
    }
  }

  if (value >= 80) {
    return {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      bar: 'bg-amber-500',
    }
  }

  return {
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    bar: 'bg-rose-500',
  }
}

function TrendBadge({ trend }) {
  if (trend === undefined || trend === null) {
    return null
  }

  const isUp = trend > 0
  const isFlat = trend === 0

  const Icon = isFlat
    ? Minus
    : isUp
      ? TrendingUp
      : TrendingDown

  const color = isFlat
    ? 'text-gray-400'
    : isUp
      ? 'text-emerald-400'
      : 'text-rose-400'

  return (
    <span
      className={`inline-flex items-center gap-1 text-[0.95rem] font-semibold ${color}`}
    >
      <Icon size={16} strokeWidth={2.5} />

      {isFlat ? '0%' : `${isUp ? '+' : ''}${trend}%`}
    </span>
  )
}

function RouteStatCard({ stat }) {
  return (
    <article className="rounded-xl border border-white/5 bg-[#0f1729] px-5 py-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p
          className={`text-[1.05rem] font-bold tracking-tight ${
            stat.highlight
              ? 'text-[#3b82f6]'
              : 'text-gray-400'
          }`}
        >
          {stat.label}
        </p>

        <TrendBadge trend={stat.trend} />
      </div>

      <p className="text-[2rem] font-semibold leading-tight text-white">
        {stat.value}
      </p>
    </article>
  )
}

function PeakHoursCard({ hours = [] }) {
  return (
    <article className="rounded-xl border border-white/5 bg-[#0f1729] px-5 py-4 shadow-sm">
      <p className="mb-3 text-[1.05rem] font-bold tracking-tight text-gray-400">
        Peak Hours
      </p>

      {hours.length === 0 ? (
        <p className="text-sm text-gray-500">No peak hour data available.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {hours.map((hour) => (
            <span
              key={hour}
              className="w-fit rounded-full bg-white/5 px-3 py-1.5 text-[0.9rem] font-semibold text-gray-300"
            >
              {hour}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}

function RouteAdherenceTable({ rows = [] }) {
  const [sortDir, setSortDir] = useState('asc')
  const [query, setQuery] = useState('')

  const parsed = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        adherenceNum: parseFloat(row.adherence) || 0,
      })),
    [rows]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    if (!q) {
      return parsed
    }

    return parsed.filter((row) => {
      const driver = String(row.driver ?? '').toLowerCase()
      const busId = String(row.busId ?? '').toLowerCase()
      const trip = String(row.trip ?? '').toLowerCase()

      return (
        driver.includes(q) ||
        busId.includes(q) ||
        trip.includes(q)
      )
    })
  }, [parsed, query])

  const sorted = useMemo(() => {
    const copy = [...filtered]

    copy.sort((a, b) =>
      sortDir === 'asc'
        ? a.adherenceNum - b.adherenceNum
        : b.adherenceNum - a.adherenceNum
    )

    return copy
  }, [filtered, sortDir])

  const toggleSort = () => {
    setSortDir((current) =>
      current === 'asc' ? 'desc' : 'asc'
    )
  }

  return (
    <section className="rounded-xl border border-white/5 bg-[#0f1729] p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[1.5rem] font-bold text-white">
            Driver Route Adherence
          </h2>

          <p className="text-[0.9rem] text-gray-400">
            Last 7 days · {sorted.length} drivers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search driver, bus, trip"
            className="w-48 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[0.9rem] text-white placeholder:text-gray-500 outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-[1rem]">
          <thead>
            <tr className="border-b border-white/10 text-left text-gray-400">
              <th className="px-3 py-2 text-[0.85rem] font-semibold uppercase tracking-wide">
                Driver
              </th>

              <th className="px-3 py-2 text-[0.85rem] font-semibold uppercase tracking-wide">
                Bus-ID
              </th>

              <th className="px-3 py-2 text-[0.85rem] font-semibold uppercase tracking-wide">
                Trip
              </th>

              <th className="px-3 py-2 text-right text-[0.85rem] font-semibold uppercase tracking-wide">
                <button
                  type="button"
                  onClick={toggleSort}
                  className="inline-flex items-center gap-1 text-gray-400 hover:text-white"
                  aria-label="Sort adherence"
                >
                  Adherence

                  {sortDir === 'asc' ? (
                    <ArrowUp size={13} />
                  ) : (
                    <ArrowDown size={13} />
                  )}
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((row, index) => {
              const tone = adherenceTone(row.adherenceNum)

              return (
                <tr
                  key={`${row.driver}-${row.busId}-${index}`}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-3 py-2.5 font-medium text-white">
                    {row.driver}
                  </td>

                  <td className="px-3 py-2.5 text-gray-400">
                    {row.busId}
                  </td>

                  <td className="px-3 py-2.5 text-gray-400">
                    {row.trip}
                  </td>

                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={`inline-block min-w-[3.5rem] rounded-full px-2.5 py-1 text-center text-[0.9rem] font-bold ${tone.text} ${tone.bg}`}
                    >
                      {row.adherence}
                    </span>
                  </td>
                </tr>
              )
            })}

            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-gray-500"
                >
                  No drivers match "{query}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[0.85rem] text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          90%+
        </span>

        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          80–89%
        </span>

        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          Below 80%
        </span>
      </div>
    </section>
  )
}

function PeakDemandHours({ hours = [] }) {
  if (hours.length === 0) {
    return (
      <section className="rounded-xl border border-white/5 bg-[#0f1729] p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-[1.5rem] font-bold text-white">
            Peak Demand Hours
          </h2>

          <p className="text-[0.9rem] text-gray-400">
            Passengers by time block, today
          </p>
        </div>

        <p className="text-gray-500">
          No demand data available.
        </p>
      </section>
    )
  }

  const max = Math.max(
    ...hours.map((hour) => Number(hour.value) || 0)
  )

  return (
    <section className="rounded-xl border border-white/5 bg-[#0f1729] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-[1.5rem] font-bold text-white">
          Peak Demand Hours
        </h2>

        <p className="text-[0.9rem] text-gray-400">
          Passengers by time block, today
        </p>
      </div>

      <div className="space-y-3">
        {hours.map((hour, index) => {
          const value = Number(hour.value) || 0
          const isPeak = value === max

          return (
            <div
              key={`${hour.label}-${index}`}
              className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-3"
            >
              <p
                className={`text-[0.95rem] ${
                  isPeak
                    ? 'font-bold text-white'
                    : 'text-gray-400'
                }`}
              >
                {hour.label}
              </p>

              <div className="h-3.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full ${
                    isPeak
                      ? 'bg-[#3b82f6]'
                      : 'bg-[#f4c400]'
                  }`}
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(value * 100, 100)
                    )}%`,
                  }}
                />
              </div>

              <p
                className={`text-right text-[0.9rem] tabular-nums ${
                  isPeak
                    ? 'font-bold text-white'
                    : 'text-gray-400'
                }`}
              >
                {hour.passengers ??
                  `${Math.round(value * 100)}%`}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

const DEFAULT_ROUTE_STAT_SHELLS = [
  { label: 'Total Trips' },
  { label: 'Avg Daily Passengers' },
  { label: 'Route Adherence' },
]

function RoutesPanel({
  routeStats = DEFAULT_ROUTE_STAT_SHELLS,
  routeAdherenceRows = [],
  peakDemandHours = [],
  peakHours = [],
}) {
  return (
    <section className="rounded-2xl bg-[#0a0e1a] p-4">
      <header className="mb-4 flex items-center rounded-xl border border-white/5 bg-[#0f1729] px-5 py-4 shadow-sm">
        <div>
          <h1 className="text-[1.75rem] font-bold text-white">
            Analytical Reports
          </h1>

          <p className="text-[0.9rem] text-gray-400">
            Route performance and demand insights
          </p>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {routeStats
          .filter((stat) => stat.label !== 'Peak Hours')
          .map((stat) => (
            <RouteStatCard
              key={stat.label}
              stat={stat}
            />
          ))}

        <PeakHoursCard hours={peakHours} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <RouteAdherenceTable
          rows={routeAdherenceRows}
        />

        <PeakDemandHours
          hours={peakDemandHours}
        />
      </div>
    </section>
  )
}

/* =============================================================================
   Schedule Panel + Add Trip Modal
   ========================================================================== */

function ScheduleStatCard({ label, value, highlight = false }) {
  return (
    <article className="flex flex-col items-center justify-center rounded-xl bg-[#131a2e] px-6 py-8 shadow-sm">
      <p className="mb-2 text-sm text-gray-400">{label}</p>
      <p
        className={`text-xl font-semibold ${
          highlight ? 'text-[#4d8eff]' : 'text-gray-100'
        }`}
      >
        {value}
      </p>
    </article>
  )
}

const emptyTripForm = {
  busId: '',
  departure: '',
  destination: '',
  driver: '',
  chauffeur: '',
  departureTime: '',
  serviceType: 'Aircon',
}

function AddTripModal({ onClose, onAdd, staff }) {
  const [form, setForm] = useState(emptyTripForm)

  const drivers = staff.filter(
    (member) => member.position === 'Driver'
  )

  const chauffeurs = staff.filter(
    (member) => member.position === 'Chauffeur'
  )

  function handleChange(event) {
    const { name, value } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (
      !form.busId ||
      !form.departure ||
      !form.destination ||
      !form.driver ||
      !form.chauffeur ||
      !form.departureTime
    ) {
      return
    }

    onAdd({
      busId: form.busId,
      departure: form.departure,
      destination: form.destination,
      route: `${form.departure} - ${form.destination}`,
      driver: form.driver,
      chauffeur: form.chauffeur,
      departureTime: form.departureTime,
      serviceType: form.serviceType,
      status: 'Upcoming',
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#131a2e] p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-100">
            Add Trip
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-400">
                Bus ID
              </span>

              <input
                type="text"
                name="busId"
                value={form.busId}
                onChange={handleChange}
                placeholder="e.g. B-107"
                className="w-full rounded-lg border border-gray-700 bg-[#0d1220] px-3 py-2 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-[#4d8eff] focus:ring-1 focus:ring-[#4d8eff]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-400">
                Departure Time
              </span>

              <input
                type="text"
                name="departureTime"
                value={form.departureTime}
                onChange={handleChange}
                placeholder="e.g. 5:00 AM"
                className="w-full rounded-lg border border-gray-700 bg-[#0d1220] px-3 py-2 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-[#4d8eff] focus:ring-1 focus:ring-[#4d8eff]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-400">
                Departure
              </span>

              <input
                type="text"
                name="departure"
                value={form.departure}
                onChange={handleChange}
                placeholder="e.g. Davao City"
                className="w-full rounded-lg border border-gray-700 bg-[#0d1220] px-3 py-2 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-[#4d8eff] focus:ring-1 focus:ring-[#4d8eff]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-400">
                Destination
              </span>

              <input
                type="text"
                name="destination"
                value={form.destination}
                onChange={handleChange}
                placeholder="e.g. Cateel"
                className="w-full rounded-lg border border-gray-700 bg-[#0d1220] px-3 py-2 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-[#4d8eff] focus:ring-1 focus:ring-[#4d8eff]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-400">
                Driver
              </span>

              <select
                name="driver"
                value={form.driver}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-700 bg-[#0d1220] px-3 py-2 text-sm text-gray-100 outline-none focus:border-[#4d8eff] focus:ring-1 focus:ring-[#4d8eff]"
              >
                <option value="">
                  Select Driver
                </option>

                {drivers.map((member) => (
                  <option
                    key={member.staffId}
                    value={member.name}
                  >
                    {member.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-400">
                Chauffeur
              </span>

              <select
                name="chauffeur"
                value={form.chauffeur}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-700 bg-[#0d1220] px-3 py-2 text-sm text-gray-100 outline-none focus:border-[#4d8eff] focus:ring-1 focus:ring-[#4d8eff]"
              >
                <option value="">
                  Select Chauffeur
                </option>

                {chauffeurs.map((member) => (
                  <option
                    key={member.staffId}
                    value={member.name}
                  >
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-400">
              Type Of Service
            </span>

            <select
              name="serviceType"
              value={form.serviceType}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-700 bg-[#0d1220] px-3 py-2 text-sm text-gray-100 outline-none focus:border-[#4d8eff] focus:ring-1 focus:ring-[#4d8eff]"
            >
              <option value="Aircon">
                Aircon
              </option>

              <option value="Non-Aircon">
                Non-Aircon
              </option>
            </select>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-700 px-5 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-[#4d8eff] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3b7de0]"
            >
              Add Trip
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SchedulePanel({ scheduleStats, initialTrips, staff }) {
  const [trips, setTrips] = useState(initialTrips)
  const [showAddTrip, setShowAddTrip] = useState(false)

  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  function handleAddTrip(trip) {
    setTrips((prev) => [...prev, trip])
  }

  return (
    <>
      <header className="flex items-center justify-between rounded-xl bg-[#131a2e] px-8 py-5 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-100">Trip Schedule</h1>
        <p className="text-sm text-gray-400">{formattedDate}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {scheduleStats.map((stat) => (
          <ScheduleStatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className="rounded-xl bg-[#131a2e] p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-100">Schedule</h2>
          <button
            type="button"
            onClick={() => setShowAddTrip(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#4d8eff]/40 bg-transparent px-4 py-2 text-sm font-medium text-[#4d8eff] transition-colors hover:bg-[#4d8eff]/10"
          >
            <Plus className="h-4 w-4" />
            Add Trip
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#0d1220]">
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Bus ID
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">
                  Route
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">
                  Driver
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">
                  Chauffeur
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Departure Time
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Type Of Service
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip, index) => (
                <tr
                  key={`${trip.busId}-${index}`}
                  className={index % 2 === 0 ? 'bg-[#131a2e]' : 'bg-[#0f1526]'}
                >
                  <td className="px-4 py-3 text-center text-gray-300">{trip.busId}</td>
                  <td className="px-4 py-3 text-left text-gray-300">{trip.route}</td>
                  <td className="px-4 py-3 text-left text-gray-300">{trip.driver}</td>
                  <td className="px-4 py-3 text-left text-gray-300">{trip.chauffeur}</td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {trip.departureTime}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {trip.serviceType}
                  </td>
                  <td className={`px-4 py-3 text-center font-medium ${
                    trip.status === 'Ongoing' ? 'text-[#4d8eff]' : 'text-gray-300'
                  }`}>
                    {trip.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showAddTrip ? (
        <AddTripModal
          onClose={() => setShowAddTrip(false)}
          onAdd={handleAddTrip}
          staff={staff}
        />
      ) : null}
    </>
  )
}

/* =============================================================================
   Staff Panel + Add Staff Modal
   ========================================================================== */

const emptyStaffForm = {
  firstName: '',
  lastName: '',
  middleName: '',
  position: '',
  contactNumber: '',
  email: '',
}

function AddStaffModal({ onClose, onAdd, nextStaffId }) {
  const [form, setForm] = useState(emptyStaffForm)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!form.firstName || !form.lastName || !form.position || !form.contactNumber || !form.email) {
      return
    }

    const name = [form.firstName, form.middleName, form.lastName]
      .filter(Boolean)
      .join(' ')

    onAdd({
      staffId: nextStaffId,
      name,
      position: form.position,
      contactNumber: form.contactNumber,
      email: form.email,
      status: 'Active',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0f1729] border border-white/10 p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-300" />
            <h2 className="text-xl font-bold text-white">Add New Staff</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-400">First Name</span>
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="Juan"
              className="w-full rounded-lg border border-white/10 bg-[#1a2438] px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-400">Last Name</span>
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="dela Cruz"
              className="w-full rounded-lg border border-white/10 bg-[#1a2438] px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-400">Middle Name</span>
            <input
              type="text"
              name="middleName"
              value={form.middleName}
              onChange={handleChange}
              placeholder="Middle Name"
              className="w-full rounded-lg border border-white/10 bg-[#1a2438] px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-400">Position</span>
            <select
              name="position"
              value={form.position}
              onChange={handleChange}
              className="w-full rounded-lg border border-white/10 bg-[#1a2438] px-3 py-2.5 text-sm text-gray-100 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            >
              <option value="" className="bg-[#1a2438]">Select Position</option>
              <option value="Driver" className="bg-[#1a2438]">Driver</option>
              <option value="Chauffeur" className="bg-[#1a2438]">Chauffeur</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-400">
              Contact Number
            </span>
            <input
              type="text"
              name="contactNumber"
              value={form.contactNumber}
              onChange={handleChange}
              placeholder="09XX XXX XXXX"
              className="w-full rounded-lg border border-white/10 bg-[#1a2438] px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-400">Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="staff@example.com"
              className="w-full rounded-lg border border-white/10 bg-[#1a2438] px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-5 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#00a8cc]/40 bg-transparent px-5 py-2 text-sm font-medium text-[#00a8cc] transition-colors hover:bg-[#00a8cc]/10"
            >
              <Check className="h-4 w-4" />
              Save Staff
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StaffPanel({ initialStaff }) {
  const [staff, setStaff] = useState(initialStaff)
  const [showAddStaff, setShowAddStaff] = useState(false)

  function getNextStaffId() {
    const maxId = staff.reduce((max, member) => {
      const num = parseInt(member.staffId.replace('S', ''), 10)
      return num > max ? num : max
    }, 200)
    return `S${maxId + 1}`
  }

  function handleAddStaff(member) {
    setStaff((prev) => [...prev, member])
  }

  return (
    <>
      <header className="rounded-xl bg-[#0f1729] px-8 py-5 shadow-sm border border-white/5">
        <h1 className="text-2xl font-bold text-white">Staff Management</h1>
      </header>

      <section className="rounded-xl bg-[#0f1729] p-6 shadow-sm border border-white/5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Personnel</h2>
          <button
            type="button"
            onClick={() => setShowAddStaff(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#00a8cc]/40 bg-transparent px-4 py-2 text-sm font-medium text-[#00a8cc] transition-colors hover:bg-[#00a8cc]/10"
          >
            <Plus className="h-4 w-4" />
            Add Staff
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#1a2438]">
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Staff ID
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">
                  Staff Name
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Position
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Contact Number
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">
                  Email
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member, index) => (
                <tr
                  key={member.staffId}
                  className={`border-b border-white/5 ${
                    index % 2 === 0 ? 'bg-[#0f1729]' : 'bg-[#141d33]'
                  }`}
                >
                  <td className="px-4 py-3 text-center text-gray-300">
                    {member.staffId}
                  </td>
                  <td className="px-4 py-3 text-left text-gray-300">{member.name}</td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {member.position}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {member.contactNumber}
                  </td>
                  <td className="px-4 py-3 text-left text-gray-300">{member.email}</td>
                  <td className="px-4 py-3 text-center font-medium">
                    <span
                      className={
                        member.status === 'Active'
                          ? 'text-[#00a8cc] font-semibold'
                          : 'text-gray-400 font-semibold'
                      }
                    >
                      {member.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showAddStaff ? (
        <AddStaffModal
          onClose={() => setShowAddStaff(false)}
          onAdd={handleAddStaff}
          nextStaffId={getNextStaffId()}
        />
      ) : null}
    </>
  )
}


/* =============================================================================
   Dashboard Panel
   ========================================================================== */

function todayDateKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeTripStatus(status) {
  const value = String(status ?? '').toLowerCase()
  if (value.includes('arriv') || value.includes('complet') || value.includes('done')) return 'Arrived'
  if (value.includes('ongoing') || value.includes('progress') || value.includes('active')) return 'Ongoing'
  return 'Upcoming'
}

function isBusActive(bus) {
  const value = String(bus?.status ?? '').toLowerCase()
  return value === 'active' || value === 'available' || value === 'operational' || value === 'ok'
}

function currencyPHP(value) {
  return `₱${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function DashboardPanel() {
  const [buses, setBuses] = useState([])
  const [trips, setTrips] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadDashboardData() {
      setIsLoading(true)

      try {
        const [busesData, tripsData] = await Promise.all([
          safeJsonFetch('/api/buses'),
          safeJsonFetch(`/api/trips?date=${todayDateKey()}`),
        ])

        if (!cancelled) {
          setBuses(Array.isArray(busesData) ? busesData : busesData?.data ?? [])
          setTrips(Array.isArray(tripsData) ? tripsData : tripsData?.data ?? [])
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Unable to load dashboard data:', err)
          setBuses([])
          setTrips([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadDashboardData()

    return () => {
      cancelled = true
    }
  }, [])

  const normalizedTrips = useMemo(
    () =>
      trips.map((trip) => ({
        busId: trip.busId ?? trip.bus_id ?? trip.busID ?? '—',
        route:
          trip.route ??
          (trip.departure && trip.destination ? `${trip.departure} - ${trip.destination}` : '—'),
        departureTime: trip.departureTime ?? trip.departure_time ?? '—',
        serviceType: trip.serviceType ?? trip.service_type ?? '—',
        status: normalizeTripStatus(trip.status),
        revenue:
          trip.totalRevenue ??
          trip.total_revenue ??
          (Number(trip.cashPayments ?? trip.cash_payments ?? 0) +
            Number(trip.digitalPayments ?? trip.digital_payments ?? 0)),
        passengers: Number(trip.passengers ?? trip.passengerCount ?? trip.passenger_count ?? 0),
      })),
    [trips],
  )

  const stats = useMemo(() => {
    const activeBuses = buses.filter(isBusActive).length
    const totalRevenue = normalizedTrips.reduce((sum, trip) => sum + Number(trip.revenue || 0), 0)
    const totalPassengers = normalizedTrips.reduce((sum, trip) => sum + Number(trip.passengers || 0), 0)

    return [
      { label: 'Active Buses', value: isLoading ? '' : activeBuses },
      { label: 'Trips Today', value: isLoading ? '' : normalizedTrips.length },
      { label: "Today's Revenue", value: isLoading ? '' : currencyPHP(totalRevenue), highlight: true },
      { label: 'Total Passengers', value: isLoading ? '' : `${totalPassengers.toLocaleString()} Passengers` },
    ]
  }, [buses, normalizedTrips, isLoading])

  return (
    <>
      <DashboardHeader title="Dashboard" stats={stats} trips={normalizedTrips} isDashboardView />

      {!isLoading && normalizedTrips.length === 0 && (
        <p className="-mt-2 text-center text-sm text-gray-500">No trips found for today.</p>
      )}
    </>
  )
}

/* =============================================================================
   Operator Dashboard
   ========================================================================== */

export default function OperatorDashboard({ user }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')

  const handleLogout = async () => {
    await StaffService.logout('operator').catch(() => {})
    navigate('/employee/login', { replace: true })
  }

  const renderPanel = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPanel />
      case 'fleets':
        return <FleetsPanel fleetTrips={[]} />
      case 'routes':
        return (
          <RoutesPanel
            routeAdherenceRows={[]}
            peakDemandHours={[]}
          />
        )
      case 'schedule':
        return (
          <SchedulePanel
            scheduleStats={[]}
            initialTrips={[]}
            staff={[]}
          />
        )
      case 'reports':
        return <ReportsPanel />
      case 'staff':
        return <StaffPanel initialStaff={[]} />
      case 'settings':
        return <AccountSettings user={user} onLogout={handleLogout} />
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0a0e1a]">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 space-y-4 p-6">{renderPanel()}</main>
    </div>
  )
}