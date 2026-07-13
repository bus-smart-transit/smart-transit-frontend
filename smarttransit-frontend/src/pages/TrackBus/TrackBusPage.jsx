import { useRef, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import { BusIcon, MapPinIcon } from "../../components/Icons.jsx";
import { DUMMY_GPS_PATH } from "../../data/sampleData.js";
import "./TrackBusPage.css";

// --- About this page -------------------------------------------------
// There's no real GPS hardware or backend yet, so this page simulates
// live tracking using a fixed list of dummy coordinates (DUMMY_GPS_PATH
// in src/data/sampleData.js) and an SVG path animation.
//
// To connect this to a real map later:
//   1. Swap the <svg> section below for a Google Maps / Leaflet /
//      OpenStreetMap component.
//   2. Replace DUMMY_GPS_PATH with coordinates from a real GPS feed
//      (e.g. polled every few seconds from your backend).
//   3. The rest of the UI (route info, ETA card) can stay the same.
// ----------------------------------------------------------------------

// Map the sample lat/lng values onto simple SVG canvas positions,
// since we're not rendering a real map projection here.
const SVG_POINTS = [
  { x: 60, y: 260 },
  { x: 220, y: 160 },
  { x: 400, y: 190 },
  { x: 560, y: 60 },
];

const pathD = `M ${SVG_POINTS.map((p) => `${p.x},${p.y}`).join(" L ")}`;

export default function TrackBusPage() {
  const [tracking, setTracking] = useState(false);
  const [currentStop, setCurrentStop] = useState(0);
  const animateRef = useRef(null);

  const handleTrackLive = () => {
    setTracking(true);
    setCurrentStop(0);
    if (animateRef.current) {
      animateRef.current.beginElement();
    }
  };

  return (
    <DashboardLayout>
      <div className="track-bus-page">
        <div className="track-bus-page__header">
          <div>
            <h1>Track Bus</h1>
            <p>Ecoland Terminal → Tagum Terminal · Bus 01</p>
          </div>
          <button className="track-bus-page__btn" onClick={handleTrackLive}>
            {tracking ? "Tracking Live…" : "Track Live"}
          </button>
        </div>

        <div className="track-bus-map">
          <svg viewBox="0 0 620 320" className="track-bus-map__svg">
            <path d={pathD} className="track-bus-map__route" fill="none" />

            {SVG_POINTS.map((point, i) => (
              <g key={i}>
                <circle cx={point.x} cy={point.y} r={7} className="track-bus-map__stop-dot" />
                <text x={point.x} y={point.y - 16} className="track-bus-map__stop-label">
                  {DUMMY_GPS_PATH[i].label}
                </text>
              </g>
            ))}

            {tracking && (
              <g>
                <circle r="10" fill="var(--color-blue)" opacity="0.9">
                  <animateMotion
                    ref={animateRef}
                    dur="6s"
                    begin="indefinite"
                    fill="freeze"
                    path={pathD}
                    onBeginEvent={() => setCurrentStop(0)}
                    onEndEvent={() => setCurrentStop(SVG_POINTS.length - 1)}
                  />
                </circle>
              </g>
            )}
          </svg>

          {!tracking && (
            <div className="track-bus-map__placeholder">
              <BusIcon size={28} />
              <p>Press "Track Live" to simulate this bus's GPS location.</p>
            </div>
          )}
        </div>

        <div className="track-bus-page__info">
          <div className="track-bus-info-card">
            <MapPinIcon size={20} />
            <div>
              <p className="track-bus-info-card__label">Current Stop</p>
              <p className="track-bus-info-card__value">
                {DUMMY_GPS_PATH[currentStop].label}
              </p>
            </div>
          </div>
          <div className="track-bus-info-card">
            <BusIcon size={20} />
            <div>
              <p className="track-bus-info-card__label">Estimated Arrival</p>
              <p className="track-bus-info-card__value">8:30 AM</p>
            </div>
          </div>
        </div>

        <p className="track-bus-page__note">
          This is sample tracking data for demonstration. Once GPS hardware
          and a backend are connected, this page can show each bus's real
          location on a live map.
        </p>
      </div>
    </DashboardLayout>
  );
}
