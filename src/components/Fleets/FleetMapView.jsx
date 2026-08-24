import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/*
|--------------------------------------------------------------------------
| CITY COORDINATES
|--------------------------------------------------------------------------
|
| These are used to determine the departure and destination.
|
| IMPORTANT:
| Leaflet = [latitude, longitude]
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| BUS ICON
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| NORMALIZE LOCATION NAME
|--------------------------------------------------------------------------
*/

function normalizeLocation(name) {
  if (!name) return ''

  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/*
|--------------------------------------------------------------------------
| GET COORDINATES
|--------------------------------------------------------------------------
*/

function getLocationCoordinates(name) {
  const normalized = normalizeLocation(name)

  if (LOCATIONS[normalized]) {
    return LOCATIONS[normalized]
  }

  /*
  |--------------------------------------------------------------------------
  | Try partial matching
  |--------------------------------------------------------------------------
  */

  const key = Object.keys(LOCATIONS).find(
    (location) =>
      normalized.includes(location) ||
      location.includes(normalized),
  )

  if (key) {
    return LOCATIONS[key]
  }

  return null
}

/*
|--------------------------------------------------------------------------
| GET DEPARTURE + DESTINATION FROM SELECTED TRIP
|--------------------------------------------------------------------------
|
| Supports:
|
| {
|   origin: "Davao",
|   destination: "Tagum"
| }
|
| OR:
|
| {
|   route: "Davao - Tagum"
| }
|--------------------------------------------------------------------------
*/

function getTripLocations(trip) {
  /*
  |--------------------------------------------------------------------------
  | Preferred method:
  | explicit origin / destination
  |--------------------------------------------------------------------------
  */

  if (trip.origin && trip.destination) {
    return {
      originName: trip.origin,
      destinationName: trip.destination,

      origin: getLocationCoordinates(
        trip.origin,
      ),

      destination: getLocationCoordinates(
        trip.destination,
      ),
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Fallback:
  | parse "Davao - Tagum"
  |--------------------------------------------------------------------------
  */

  if (trip.route) {
    const parts = trip.route
      .split(/\s[-–—]\s/)

    if (parts.length >= 2) {
      const originName = parts[0].trim()
      const destinationName = parts
        .slice(1)
        .join(' - ')
        .trim()

      return {
        originName,
        destinationName,

        origin: getLocationCoordinates(
          originName,
        ),

        destination:
          getLocationCoordinates(
            destinationName,
          ),
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

/*
|--------------------------------------------------------------------------
| FIND POINT ALONG REAL ROAD ROUTE
|--------------------------------------------------------------------------
|
| progress:
|
| 0.00 = departure
| 0.25 = 25% of route
| 0.50 = halfway
| 0.75 = 75%
| 1.00 = destination
|--------------------------------------------------------------------------
*/

function getPointAlongRoute(
  route,
  progress,
) {
  if (!route || route.length === 0) {
    return null
  }

  if (route.length === 1) {
    return route[0]
  }

  const safeProgress = Math.max(
    0,
    Math.min(1, Number(progress) || 0),
  )

  /*
  |--------------------------------------------------------------------------
  | Calculate every road segment length
  |--------------------------------------------------------------------------
  */

  const distances = []

  let totalDistance = 0

  for (
    let i = 0;
    i < route.length - 1;
    i++
  ) {
    const start = route[i]
    const end = route[i + 1]

    const distance = Math.sqrt(
      Math.pow(end[0] - start[0], 2) +
        Math.pow(end[1] - start[1], 2),
    )

    distances.push(distance)
    totalDistance += distance
  }

  const targetDistance =
    totalDistance * safeProgress

  let accumulatedDistance = 0

  /*
  |--------------------------------------------------------------------------
  | Find which road segment contains the bus
  |--------------------------------------------------------------------------
  */

  for (
    let i = 0;
    i < distances.length;
    i++
  ) {
    const segmentDistance = distances[i]

    if (
      accumulatedDistance +
        segmentDistance >=
      targetDistance
    ) {
      const distanceIntoSegment =
        targetDistance -
        accumulatedDistance

      const segmentProgress =
        segmentDistance === 0
          ? 0
          : distanceIntoSegment /
            segmentDistance

      const start = route[i]
      const end = route[i + 1]

      return [
        start[0] +
          (end[0] - start[0]) *
            segmentProgress,

        start[1] +
          (end[1] - start[1]) *
            segmentProgress,
      ]
    }

    accumulatedDistance += segmentDistance
  }

  return route[route.length - 1]
}

/*
|--------------------------------------------------------------------------
| GET COMPLETED PORTION OF ROAD
|--------------------------------------------------------------------------
*/

function getCompletedRoute(
  route,
  progress,
) {
  if (!route || route.length === 0) {
    return []
  }

  if (route.length === 1) {
    return route
  }

  const safeProgress = Math.max(
    0,
    Math.min(1, Number(progress) || 0),
  )

  if (safeProgress <= 0) {
    return [route[0]]
  }

  if (safeProgress >= 1) {
    return route
  }

  /*
  |--------------------------------------------------------------------------
  | Calculate distances
  |--------------------------------------------------------------------------
  */

  const distances = []

  let totalDistance = 0

  for (
    let i = 0;
    i < route.length - 1;
    i++
  ) {
    const start = route[i]
    const end = route[i + 1]

    const distance = Math.sqrt(
      Math.pow(end[0] - start[0], 2) +
        Math.pow(end[1] - start[1], 2),
    )

    distances.push(distance)
    totalDistance += distance
  }

  const targetDistance =
    totalDistance * safeProgress

  let accumulatedDistance = 0

  const completed = [route[0]]

  for (
    let i = 0;
    i < distances.length;
    i++
  ) {
    const segmentDistance = distances[i]

    if (
      accumulatedDistance +
        segmentDistance >=
      targetDistance
    ) {
      const distanceIntoSegment =
        targetDistance -
        accumulatedDistance

      const segmentProgress =
        segmentDistance === 0
          ? 0
          : distanceIntoSegment /
            segmentDistance

      const start = route[i]
      const end = route[i + 1]

      completed.push([
        start[0] +
          (end[0] - start[0]) *
            segmentProgress,

        start[1] +
          (end[1] - start[1]) *
            segmentProgress,
      ])

      break
    }

    completed.push(route[i + 1])

    accumulatedDistance +=
      segmentDistance
  }

  return completed
}

/*
|--------------------------------------------------------------------------
| MOVE MAP TO BUS
|--------------------------------------------------------------------------
*/

function MapUpdater({ position }) {
  const map = useMap()

  useEffect(() => {
    if (!position) return

    map.panTo(position, {
      animate: true,
      duration: 0.8,
    })
  }, [map, position])

  return null
}

/*
|--------------------------------------------------------------------------
| TRACKING ROW
|--------------------------------------------------------------------------
*/

function TrackingRow({ trip }) {
  const progress = Math.max(
    0,
    Math.min(
      1,
      Number(trip.progress) || 0,
    ),
  )

  return (
    <article className="rounded-2xl bg-white px-3 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-gray-700 sm:text-[0.95rem]">
        <span>{trip.route}</span>

        <span>{trip.busId}</span>

        <span className="text-xs font-semibold text-[#2196f3] sm:text-sm">
          {trip.status}
        </span>
      </div>

      <div className="h-2 rounded-full bg-[#e1e3e6]">
        <div
          className="h-full rounded-full bg-[#3b82f6]"
          style={{
            width: `${progress * 100}%`,
          }}
        />
      </div>
    </article>
  )
}

/*
|--------------------------------------------------------------------------
| MAIN FLEET MAP
|--------------------------------------------------------------------------
*/

export default function FleetMapView({
  selectedTrip,
  fleetTrips,
  onBack,
}) {
  /*
  |--------------------------------------------------------------------------
  | GET SELECTED BUS DEPARTURE + DESTINATION
  |--------------------------------------------------------------------------
  */

  const tripLocations = useMemo(
    () =>
      getTripLocations(
        selectedTrip,
      ),
    [selectedTrip],
  )

  const {
    originName,
    destinationName,
    origin,
    destination,
  } = tripLocations

  /*
  |--------------------------------------------------------------------------
  | OTHER TRIPS
  |--------------------------------------------------------------------------
  */

  const otherTrips = useMemo(
    () =>
      fleetTrips.filter(
        (trip) =>
          trip.busId !==
          selectedTrip.busId,
      ),
    [
      fleetTrips,
      selectedTrip.busId,
    ],
  )

  /*
  |--------------------------------------------------------------------------
  | ROAD ROUTE
  |--------------------------------------------------------------------------
  */

  const [roadRoute, setRoadRoute] =
    useState([])

  const [routeLoading, setRouteLoading] =
    useState(false)

  const [routeError, setRouteError] =
    useState(false)

  /*
  |--------------------------------------------------------------------------
  | REQUEST ROUTE EVERY TIME THE BUS ROUTE CHANGES
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let cancelled = false

    async function loadRoadRoute() {
      /*
      |--------------------------------------------------------------------------
      | If we cannot identify locations
      |--------------------------------------------------------------------------
      */

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
        /*
        |--------------------------------------------------------------------------
        | OSRM uses:
        |
        | longitude,latitude
        |--------------------------------------------------------------------------
        */

        const start =
          `${origin[1]},${origin[0]}`

        const end =
          `${destination[1]},${destination[0]}`

        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${start};${end}` +
          `?overview=full&geometries=geojson`

        const response =
          await fetch(url)

        if (!response.ok) {
          throw new Error(
            'OSRM request failed',
          )
        }

        const data =
          await response.json()

        if (
          data.code !== 'Ok' ||
          !data.routes ||
          data.routes.length === 0
        ) {
          throw new Error(
            'No road route found',
          )
        }

        /*
        |--------------------------------------------------------------------------
        | Convert OSRM:
        |
        | [longitude, latitude]
        |
        | to Leaflet:
        |
        | [latitude, longitude]
        |--------------------------------------------------------------------------
        */

        const coordinates =
          data.routes[0].geometry.coordinates.map(
            ([longitude, latitude]) => [
              latitude,
              longitude,
            ],
          )

        if (!cancelled) {
          setRoadRoute(coordinates)
        }
      } catch (error) {
        console.error(
          'Unable to load road route:',
          error,
        )

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
  }, [
    origin,
    destination,
  ])

  /*
  |--------------------------------------------------------------------------
  | BUS POSITION
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  | This is calculated from the SELECTED TRIP's road route.
  |--------------------------------------------------------------------------
  */

  const busPosition = useMemo(
    () =>
      getPointAlongRoute(
        roadRoute,
        selectedTrip.progress,
      ),
    [
      roadRoute,
      selectedTrip.progress,
    ],
  )

  /*
  |--------------------------------------------------------------------------
  | COMPLETED ROAD
  |--------------------------------------------------------------------------
  */

  const completedRoute = useMemo(
    () =>
      getCompletedRoute(
        roadRoute,
        selectedTrip.progress,
      ),
    [
      roadRoute,
      selectedTrip.progress,
    ],
  )

  /*
  |--------------------------------------------------------------------------
  | MAP CENTER
  |--------------------------------------------------------------------------
  */

  const mapCenter =
    origin || [7.0736, 125.6128]

  return (
    <section className="rounded-2xl border border-gray-300 bg-[#efefef] p-3 shadow-sm sm:p-4">
      {/* ==============================================================
          BACK
      ============================================================== */}

      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2.2fr_1fr]">
        {/* ============================================================
            MAP
        ============================================================ */}

        <div className="relative h-[320px] overflow-hidden rounded-xl border border-gray-300 sm:h-[400px] md:h-[500px]">
          <MapContainer
            center={mapCenter}
            zoom={10}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            {/* ========================================================
                OPEN STREET MAP
            ======================================================== */}

            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* ========================================================
                ENTIRE ROAD ROUTE
            ======================================================== */}

            {!routeLoading &&
              roadRoute.length > 1 && (
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

            {/* ========================================================
                BUS PROGRESS ON ROAD
            ======================================================== */}

            {!routeLoading &&
              completedRoute.length > 0 && (
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

            {/* ========================================================
                DEPARTURE
            ======================================================== */}

            {origin && (
              <CircleMarker
                center={origin}
                radius={9}
                pathOptions={{
                  color: '#ffffff',
                  weight: 3,
                  fillColor: '#1d4ed8',
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>
                      {originName}
                    </strong>

                    <br />

                    Departure
                  </div>
                </Popup>
              </CircleMarker>
            )}

            {/* ========================================================
                DESTINATION
            ======================================================== */}

            {destination && (
              <CircleMarker
                center={destination}
                radius={9}
                pathOptions={{
                  color: '#ffffff',
                  weight: 3,
                  fillColor: '#16a34a',
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>
                      {destinationName}
                    </strong>

                    <br />

                    Destination
                  </div>
                </Popup>
              </CircleMarker>
            )}

            {/* ========================================================
                BUS
            ======================================================== */}

            {!routeLoading &&
              busPosition && (
                <Marker
                  position={busPosition}
                  icon={busIcon}
                  zIndexOffset={1000}
                >
                  <Popup>
                    <div className="min-w-[180px] text-sm">
                      <div className="mb-2 text-base font-bold">
                        🚌{' '}
                        {selectedTrip.busId}
                      </div>

                      <div>
                        <strong>
                          Departure:
                        </strong>{' '}
                        {originName}
                      </div>

                      <div>
                        <strong>
                          Destination:
                        </strong>{' '}
                        {destinationName}
                      </div>

                      <div>
                        <strong>
                          Status:
                        </strong>{' '}
                        {selectedTrip.status}
                      </div>

                      <div className="mt-1 font-semibold text-orange-500">
                        Progress:{' '}
                        {Math.round(
                          Number(
                            selectedTrip.progress,
                          ) * 100,
                        )}
                        %
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

            {/* ========================================================
                FOLLOW BUS
            ======================================================== */}

            {busPosition && (
              <MapUpdater
                position={busPosition}
              />
            )}
          </MapContainer>

          {/* ==========================================================
              LOADING
          ========================================================== */}

          {routeLoading && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70">
              <div className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-lg sm:px-5 sm:py-3 sm:text-sm">
                Loading road route...
              </div>
            </div>
          )}

          {/* ==========================================================
              LIVE GPS
          ========================================================== */}

          <div className="absolute left-2 top-2 z-[1000] flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-md sm:left-3 sm:top-3 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500 sm:h-2.5 sm:w-2.5" />

            Live GPS
          </div>

          {/* ==========================================================
              CURRENT BUS
          ========================================================== */}

          <div className="absolute bottom-2 left-2 z-[1000] rounded-xl bg-white px-2.5 py-1.5 shadow-md sm:bottom-3 sm:left-3 sm:px-3 sm:py-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-xl">
                🚌
              </span>

              <div>
                <div className="text-[0.65rem] text-gray-500 sm:text-xs">
                  Current Bus
                </div>

                <div className="text-sm font-bold text-gray-800 sm:text-base">
                  {selectedTrip.busId}
                </div>
              </div>
            </div>
          </div>

          {/* ==========================================================
              ROUTE INFORMATION
          ========================================================== */}

          <div className="absolute right-2 bottom-2 z-[1000] max-w-[45%] rounded-xl bg-white px-2.5 py-1.5 shadow-md sm:right-3 sm:bottom-3 sm:max-w-none sm:px-3 sm:py-2">
            <div className="text-[0.65rem] text-gray-500 sm:text-xs">
              Route
            </div>

            <div className="truncate text-xs font-semibold text-gray-800 sm:text-sm">
              {originName}
              {' → '}
              {destinationName}
            </div>
          </div>

          {/* ==========================================================
              ERROR
          ========================================================== */}

          {routeError && (
            <div className="absolute right-2 top-2 z-[1000] max-w-[160px] rounded-lg bg-white px-2.5 py-1.5 text-[0.65rem] text-red-600 shadow sm:right-3 sm:top-3 sm:max-w-[220px] sm:px-3 sm:py-2 sm:text-xs">
              Unable to load the road route for
              this trip.
            </div>
          )}
        </div>

        {/* ============================================================
            SIDEBAR
        ============================================================ */}

        <aside className="rounded-2xl border border-gray-300 bg-[#f2f2f2] p-3">
          {/* ==========================================================
              LIVE TRACKING
          ========================================================== */}

          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 sm:text-xl md:text-2xl">
              Live Tracking
            </h3>

            <span className="rounded-full bg-[#d8dadd] px-3 py-1 text-xs font-semibold text-gray-700 sm:px-4 sm:text-sm md:px-5 md:text-base">
              Status
            </span>
          </div>

          <div className="mb-6">
            <TrackingRow
              trip={selectedTrip}
            />
          </div>

          {/* ==========================================================
              OTHER TRIPS
          ========================================================== */}

          <h4 className="mb-3 text-lg font-bold text-gray-900 sm:text-xl md:text-2xl">
            Other Trips
          </h4>

          <div className="space-y-3">
            {otherTrips.map((trip) => (
              <TrackingRow
                key={`${trip.route}-${trip.busId}`}
                trip={trip}
              />
            ))}
          </div>
        </aside>
      </div>
    </section>
  )
}