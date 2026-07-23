import { useState, useEffect, useRef, useCallback } from "react";
import { Clock3, LocateFixed, MapPin, Route, Ruler } from 'lucide-react';
import "maplibre-gl/dist/maplibre-gl.css";
import { loadMapLib } from './mapDependencies';
import PassengerService from '../../api/PassengerService/PassengerService';

export default function MapView({ role = "passenger" }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const mapLibRef = useRef(null);
  const currentMarker = useRef(null);
  const destinationMarker = useRef(null);
  const fleetMarkersRef = useRef([]);
  const nearestFleetMarkerRef = useRef(null);

  const [currentCoords, setCurrentCoords] = useState(null);
  const [destinationInput, setDestinationInput] = useState("");
  const [routeMetrics, setRouteMetrics] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [fleetLocations, setFleetLocations] = useState([]);
  const [nearestFleet, setNearestFleet] = useState(null);

  const [lng] = useState(125.6047);
  const [lat] = useState(7.0707);
  const [zoom] = useState(12);

  const clearFleetMarkers = useCallback(() => {
    fleetMarkersRef.current.forEach((marker) => marker.remove());
    fleetMarkersRef.current = [];
  }, []);

  useEffect(() => {
    if (map.current) return;

    let disposed = false;

    const initMap = async () => {
      const { default: maplibregl } = await loadMapLib();
      if (disposed || map.current) return;

      mapLibRef.current = maplibregl;
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        center: [lng, lat],
        zoom,
      });
    };

    void initMap();

    return () => {
      disposed = true;
    };
  }, [lat, lng, zoom]);

  const refreshFleetLocations = useCallback(async () => {
    const maplibregl = mapLibRef.current;
    if (!map.current || !maplibregl || role !== 'passenger') return;

    try {
      const res = await PassengerService.getFleetLocations();
      const locations = res?.data ?? [];
      setFleetLocations(locations);

      clearFleetMarkers();
      fleetMarkersRef.current = locations
        .filter((row) => Number.isFinite(Number(row?.longitude)) && Number.isFinite(Number(row?.latitude)))
        .map((row) => new maplibregl.Marker({ color: '#0ea5e9' })
          .setLngLat([Number(row.longitude), Number(row.latitude)])
          .setPopup(
            new maplibregl.Popup({ offset: 20 }).setHTML(
              `<div style="color:#0f172a;font-family:sans-serif;padding:4px;">
                <p style="margin:0;font-weight:700;">Fleet ${row?.plate_number || row?.fleet_id || '-'}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#64748b;">Status: ${row?.trip_status || 'active'}</p>
              </div>`
            )
          )
          .addTo(map.current));
    } catch {
      // Ignore polling failures to avoid breaking map interactions.
    }
  }, [clearFleetMarkers, role]);

  useEffect(() => {
    if (role !== 'passenger') return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await refreshFleetLocations();
    };

    void tick();
    const id = setInterval(() => {
      void tick();
    }, 12000);

    return () => {
      cancelled = true;
      clearInterval(id);
      clearFleetMarkers();
      if (nearestFleetMarkerRef.current) {
        nearestFleetMarkerRef.current.remove();
        nearestFleetMarkerRef.current = null;
      }
    };
  }, [clearFleetMarkers, refreshFleetLocations, role]);

  const handlePinCurrentLocation = () => {
    const maplibregl = mapLibRef.current;
    if (!map.current || !maplibregl) {
      alert("Map is still loading. Please try again in a moment.");
      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        setCurrentCoords({ lng: longitude, lat: latitude });

        map.current.flyTo({ center: [longitude, latitude], zoom: 14 });

        if (currentMarker.current) {
          currentMarker.current.remove();
        }

        currentMarker.current = new maplibregl.Marker({ color: "#38bdf8" })
          .setLngLat([longitude, latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 25 }).setHTML(
              `<div style="color: #0f172a; font-family: sans-serif; padding: 4px;">
                <p style="margin: 0; font-weight: bold;">Current Location</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b; text-transform: capitalize;">Verified ${role}</p>
              </div>`
            )
          )
          .addTo(map.current);
      },
      () => alert("Unable to capture your location hardware coordinates.")
    );
  };

  const findNearestFleet = async () => {
    const maplibregl = mapLibRef.current;
    if (!currentCoords || !map.current || !maplibregl) {
      alert('Pin your current location first.');
      return;
    }

    try {
      const res = await PassengerService.getNearestFleet({
        latitude: currentCoords.lat,
        longitude: currentCoords.lng,
      });

      const nearest = res?.data ?? null;
      setNearestFleet(nearest);

      if (nearestFleetMarkerRef.current) {
        nearestFleetMarkerRef.current.remove();
        nearestFleetMarkerRef.current = null;
      }

      if (nearest && Number.isFinite(Number(nearest?.longitude)) && Number.isFinite(Number(nearest?.latitude))) {
        nearestFleetMarkerRef.current = new maplibregl.Marker({ color: '#f59e0b' })
          .setLngLat([Number(nearest.longitude), Number(nearest.latitude)])
          .setPopup(
            new maplibregl.Popup({ offset: 20 }).setHTML(
              `<div style="color:#0f172a;font-family:sans-serif;padding:4px;">
                <p style="margin:0;font-weight:700;">Nearest Fleet ${nearest?.plate_number || nearest?.fleet_id || '-'}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#64748b;">~${Number(nearest?.distance_meters || 0).toFixed(0)} m away</p>
              </div>`
            )
          )
          .addTo(map.current);
      }
    } catch {
      alert('Unable to locate nearest fleet right now. Please try again.');
    }
  };

  const handleCalculateRoute = async (e) => {
    e.preventDefault();
    const maplibregl = mapLibRef.current;
    if (!map.current || !maplibregl) {
      alert("Map is still loading. Please try again in a moment.");
      return;
    }

    if (!currentCoords) {
      alert("Please pin your current location first!");
      return;
    }
    if (!destinationInput.trim()) {
      alert("Please input a destination landmark.");
      return;
    }

    setIsCalculating(true);

    try {
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        destinationInput
      )}&viewbox=125.50,7.40,125.90,7.00&bounded=1&limit=1`;

      const geoResponse = await fetch(geocodeUrl, {
        headers: { "Accept-Language": "en" }
      });
      const geoData = await geoResponse.json();

      if (!geoData || geoData.length === 0) {
        alert("Location not found along the Davao-Tagum route. Please try a prominent landmark.");
        setIsCalculating(false);
        return;
      }

      const destinationCoords = {
        lng: parseFloat(geoData[0].lon),
        lat: parseFloat(geoData[0].lat),
        name: geoData[0].display_name.split(',')[0]
      };

      const url = `https://router.project-osrm.org/route/v1/driving/${currentCoords.lng},${currentCoords.lat};${destinationCoords.lng},${destinationCoords.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        alert("No drivable route found to that location.");
        setIsCalculating(false);
        return;
      }

      const route = data.routes[0];
      const geometry = route.geometry;

      setRouteMetrics({
        distance: `${(route.distance / 1000).toFixed(2)} km`,
        duration: `${Math.ceil(route.duration / 60)} mins`,
      });

      if (map.current.getLayer("route-line")) map.current.removeLayer("route-line");
      if (map.current.getSource("route-path")) map.current.removeSource("route-path");

      map.current.addSource("route-path", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry },
      });

      if (destinationMarker.current) {
        destinationMarker.current.remove();
      }

      destinationMarker.current = new maplibregl.Marker({ color: "#ef4444" })
        .setLngLat([destinationCoords.lng, destinationCoords.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div style="color: #0f172a; font-family: sans-serif; padding: 4px;">
              <p style="margin: 0; font-weight: bold;">${destinationCoords.name}</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">Transit Stop</p>
            </div>`
          )
        )
        .addTo(map.current);

      map.current.addLayer({
        id: "route-line",
        type: "line",
        source: "route-path",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#38bdf8", "line-width": 5 },
      });

      const coordinates = geometry.coordinates;
      const bounds = coordinates.reduce(
        (acc, coord) => acc.extend(coord),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
      );
      map.current.fitBounds(bounds, { padding: 60 });

    } catch (err) {
      console.error("Routing calculation failed:", err);
      alert("An error occurred while calculating the route corridor path.");
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="relative h-[75vh] min-h-135 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div ref={mapContainer} className="h-full w-full" />

      <aside className="absolute left-4 top-4 z-10 w-[min(92vw,26rem)] rounded-2xl border border-slate-800 bg-slate-950/92 p-4 text-slate-200 shadow-2xl backdrop-blur-md">
        <h3 className="text-lg font-semibold text-slate-100">Where are you heading?</h3>
        <p className="mt-1 text-xs text-slate-500">Calculate real-time transit routes and fares</p>

        <form onSubmit={handleCalculateRoute} className="mt-4 space-y-3">
          <button
            type="button"
            onClick={handlePinCurrentLocation}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              currentCoords
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
            }`}
          >
            <LocateFixed className="h-4 w-4" />
            {currentCoords ? 'Current Location Pinned' : 'Pin Current Location'}
          </button>

          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Destination
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 focus-within:border-sky-400">
              <MapPin className="h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Enter terminal or destination"
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                className="h-11 w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={isCalculating}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Route className="h-4 w-4" />
            {isCalculating ? 'Calculating Route...' : 'Calculate Route'}
          </button>

          {role === 'passenger' && (
            <button
              type="button"
              onClick={findNearestFleet}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/60 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
            >
              <MapPin className="h-4 w-4" />
              Track Nearest Fleet
            </button>
          )}
        </form>

        {routeMetrics && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
              <p className="inline-flex items-center gap-1 text-xs text-slate-500"><Ruler className="h-3.5 w-3.5" />Distance</p>
              <p className="font-data mt-1 text-sm font-semibold text-slate-100">{routeMetrics.distance}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
              <p className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />Est. Time</p>
              <p className="font-data mt-1 text-sm font-semibold text-slate-100">{routeMetrics.duration}</p>
            </div>
          </div>
        )}

        {role === 'passenger' && (
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
            <p>Live fleets tracked: <strong className="text-slate-200">{fleetLocations.length}</strong></p>
            <p>
              Nearest: <strong className="text-slate-200">{nearestFleet?.plate_number || nearestFleet?.fleet_id || 'Not selected'}</strong>
              {nearestFleet?.distance_meters ? ` (${Number(nearestFleet.distance_meters).toFixed(0)} m)` : ''}
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
