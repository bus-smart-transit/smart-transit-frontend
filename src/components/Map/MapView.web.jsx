import { useState, useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./MapView.css";

export default function MapView({ role = "passenger" }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const currentMarker = useRef(null); // Added tracker for current location pin too
    const destinationMarker = useRef(null);

    // Track location coordinates
    const [currentCoords, setCurrentCoords] = useState(null);
    const [destinationInput, setDestinationInput] = useState("");

    // Track routing metrics for the UI overlay panel
    const [routeMetrics, setRouteMetrics] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // Default coordinate center (Davao City)
    const [lng] = useState(125.6047);
    const [lat] = useState(7.0707);
    const [zoom] = useState(12);

    // Initialize Base Map
    useEffect(() => {
        if (map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
            center: [lng, lat],
            zoom: zoom,
        });
    }, [lng, lat, zoom]);

    // 🎯 Step 1: Secure Frontend Current Geolocation 
    const handlePinCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { longitude, latitude } = position.coords;
                setCurrentCoords({ lng: longitude, lat: latitude });

                map.current.flyTo({ center: [longitude, latitude], zoom: 14 });

                // Standardized instance tracking to prevent current location duplicates too
                if (currentMarker.current) {
                    currentMarker.current.remove();
                }

                currentMarker.current = new maplibregl.Marker({ color: "#38bdf8" })
                    .setLngLat([longitude, latitude])
                    .setPopup(
                        new maplibregl.Popup({ offset: 25 }).setHTML(
                            `<div style="color: #0f172a; font-family: sans-serif; padding: 4px;">
                                <p style="margin: 0; font-weight: bold;">📍 Current Location</p>
                                <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b; text-transform: capitalize;">Verified ${role}</p>
                            </div>`
                        )
                    )
                    .addTo(map.current);
            },
            () => alert("Unable to capture your location hardware coordinates.")
        );
    };

    // 🗺️ Step 2: Calculate Real-Road Network Path & Metrics via OSRM API
    const handleCalculateRoute = async (e) => {
        e.preventDefault();
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
            // ── 🗺️ STEP 1: FREE-TEXT GEOCODING BOUNDED TO THE DAVAO-TAGUM CORRIDOR ──
            const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                destinationInput
            )}&viewbox=125.50,7.40,125.90,7.00&bounded=1&limit=1`;

            const geoResponse = await fetch(geocodeUrl, {
                headers: { "Accept-Language": "en" }
            });
            const geoData = await geoResponse.json();

            if (!geoData || geoData.length === 0) {
                alert("Location not found along the Davao-Tagum route. Please try a prominent landmark (e.g., 'Panabo Wharf', 'Carmen', 'Tagum Terminal').");
                setIsCalculating(false);
                return;
            }

            const destinationCoords = {
                lng: parseFloat(geoData[0].lon),
                lat: parseFloat(geoData[0].lat),
                name: geoData[0].display_name.split(',')[0]
            };

            // ── 🚗 STEP 2: FETCH REAL ROAD PATH FROM OSRM ENGINE ──
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

            // ── 🎨 STEP 3: CLEAN AND RENDER THE MAP LAYERS ──
            if (map.current.getLayer("route-line")) map.current.removeLayer("route-line");
            if (map.current.getSource("route-path")) map.current.removeSource("route-path");

            map.current.addSource("route-path", {
                type: "geojson",
                data: { type: "Feature", properties: {}, geometry: geometry },
            });

            // Wipe out the old destination marker instance cleanly before re-rendering
            if (destinationMarker.current) {
                destinationMarker.current.remove();
            }

            // Drop single destination marker instance reference
            destinationMarker.current = new maplibregl.Marker({ color: "#ef4444" })
                .setLngLat([destinationCoords.lng, destinationCoords.lat])
                .setPopup(
                    new maplibregl.Popup({ offset: 25 }).setHTML(
                        `<div style="color: #0f172a; font-family: sans-serif; padding: 4px;">
                            <p style="margin: 0; font-weight: bold;">🏁 ${destinationCoords.name}</p>
                            <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">Davao-Tagum Transit Stop</p>
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

            // Zoom map layout dynamically to frame route dimensions
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
        <div className="map-view-wrapper">
            <div ref={mapContainer} className="map-canvas-container" />

            <div className="search-overlay-card">
                <h3>Where are you heading? 🚌</h3>
                <p>Calculate real-time transit routes & fares</p>

                <form onSubmit={handleCalculateRoute}>
                    <div className="input-group">
                        <button type="button" onClick={handlePinCurrentLocation} className="geo-pin-indicator">
                            {currentCoords ? "🟢 Pinned" : "📍 Pin Current Location"}
                        </button>
                        <input
                            type="text"
                            placeholder="Enter terminal or destination..."
                            value={destinationInput}
                            onChange={(e) => setDestinationInput(e.target.value)}
                        />
                    </div>

                    <button type="submit" disabled={isCalculating} className="calc-route-submit-btn">
                        {isCalculating ? "Calculating Route..." : "Calculate Route"}
                    </button>
                </form>

                {routeMetrics && (
                    <div className="metrics-results-panel">
                        <div className="metric-box">
                            <span>📏 Distance:</span>
                            <strong>{routeMetrics.distance}</strong>
                        </div>
                        <div className="metric-box">
                            <span>⏱️ Est. Time:</span>
                            <strong>{routeMetrics.duration}</strong>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}