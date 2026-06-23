import { useState, useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./MapView.css";

export default function MapView({ role = "passenger" }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const currentMarker = useRef(null);

    // Default focus coordinates centered over Davao City
    const [lng] = useState(125.6047);
    const [lat] = useState(7.0707);
    const [zoom] = useState(13);

    useEffect(() => {
        if (map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
            center: [lng, lat],
            zoom: zoom,
        });
    }, [lng, lat, zoom]);

    // ── 🎯 GEOLOCATION HANDLER ──
    const handlePinCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your web browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { longitude, latitude } = position.coords;

                // Fly the camera view smoothly to focus directly on coordinates
                map.current.flyTo({
                    center: [longitude, latitude],
                    zoom: 15,
                    essential: true,
                });

                // Wipe clear previous instance pins
                if (currentMarker.current) {
                    currentMarker.current.remove();
                }

                // Drop a fresh marker pin using your component's role context
                currentMarker.current = new maplibregl.Marker({ color: "#38bdf8" })
                    .setLngLat([longitude, latitude])
                    .setPopup(
                        new maplibregl.Popup({ offset: 25 }).setHTML(
                            `<div style="color: #0f172a; font-family: sans-serif; padding: 4px;">
                <p style="margin: 0; font-weight: bold; text-transform: capitalize;">📍 Verified ${role}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Active Location Pinned</p>
              </div>`
                        )
                    )
                    .addTo(map.current);
            },
            (error) => {
                console.error("Geolocation request rejected:", error);
                alert("Unable to access hardware coordinates. Please verify site location permissions.");
            }
        );
    };

    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

            <button onClick={handlePinCurrentLocation} className="pin-location-fab">
                📍 Pin My Location
            </button>
        </div>
    );
}