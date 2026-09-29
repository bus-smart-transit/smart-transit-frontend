import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Live interactive basemap centered on Davao City, plus a "Pin My Location"
// button that uses the browser's own geolocation. This does not yet plot
// individual buses/routes -- TrackBusPage still shows each bus's current
// stop, next stop, and ETA from sample data alongside this map.
export default function MapView() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const currentMarker = useRef(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new MapLibreMap({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [125.6047, 7.0707], // Davao City
      zoom: 12,
      attributionControl: false,
    });

    map.current.addControl(new NavigationControl({ showCompass: false }), "top-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const handlePinCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your web browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;

        map.current?.flyTo({ center: [longitude, latitude], zoom: 15, essential: true });

        currentMarker.current?.remove();
        currentMarker.current = new Marker({ color: "#6ac1b8" })
          .setLngLat([longitude, latitude])
          .setPopup(
            new Popup({ offset: 25 }).setHTML(
              `<p style="margin:0;font-weight:600;color:#0e2749;">📍 Your location</p>`
            )
          )
          .addTo(map.current);
      },
      () => {
        alert("Unable to access your location. Please check your browser's location permissions.");
      }
    );
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
      <button
        type="button"
        onClick={handlePinCurrentLocation}
        className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-teal-400 px-4 py-2 text-xs font-semibold text-navy-900 shadow-sm transition-colors hover:bg-teal-500"
      >
        📍 Pin My Location
      </button>
    </div>
  );
}
