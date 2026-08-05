import { useMemo, useRef, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import PublicLayout from "../../components/PublicLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import SearchBar from "../../components/ui/SearchBar.jsx";
import { BusIcon, MapPinIcon, ClockIcon, InfoIcon, SignalIcon } from "../../components/Icons.jsx";
import { ACTIVE_BUSES } from "../../data/sampleData.js";
import { useAuth } from "../../context/AuthContext.jsx";

function BusMap({ bus, tracking, onTrackLive }) {
  const animateRef = useRef(null);
  const pathD = `M ${bus.path.map((p) => `${p.x},${p.y}`).join(" L ")}`;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-navy-900">
      <svg viewBox="0 0 620 320" className="h-72 w-full sm:h-96">
        <path d={pathD} stroke="#41fdfe" strokeWidth="3" strokeDasharray="7 7" fill="none" opacity="0.6" />

        {bus.path.map((point, i) => (
          <g key={i}>
            <circle cx={point.x} cy={point.y} r={7} fill="#ffffff" />
            <text x={point.x} y={point.y - 14} fill="#cbd5e1" fontSize="11" textAnchor="middle">
              {point.label}
            </text>
          </g>
        ))}

        <circle
          cx={bus.path[0].x + (bus.path[bus.path.length - 1].x - bus.path[0].x) * (bus.progress / 100)}
          cy={bus.path[0].y + (bus.path[bus.path.length - 1].y - bus.path[0].y) * (bus.progress / 100)}
          r="9"
          fill="#41fdfe"
        >
          {tracking && (
            <animateMotion
              ref={animateRef}
              dur="6s"
              begin="indefinite"
              fill="freeze"
              path={pathD}
            />
          )}
        </circle>
      </svg>

      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-navy-950/70 px-4 py-2.5 text-xs text-navy-100 backdrop-blur">
        <span className="flex items-center gap-1.5">
          <SignalIcon size={14} className="text-teal-400" />
          Simulated tracking data
        </span>
        <button
          onClick={() => {
            onTrackLive();
            if (animateRef.current) animateRef.current.beginElement();
          }}
          className="font-semibold text-teal-300 hover:underline"
        >
          {tracking ? "Replay animation" : "Play animation"}
        </button>
      </div>
    </div>
  );
}

function TrackBusContent() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(ACTIVE_BUSES[0].id);
  const [tracking, setTracking] = useState(false);

  const filteredBuses = useMemo(
    () =>
      ACTIVE_BUSES.filter(
        (bus) =>
          bus.busNumber.toLowerCase().includes(query.toLowerCase()) ||
          bus.route.toLowerCase().includes(query.toLowerCase())
      ),
    [query]
  );

  const selectedBus = ACTIVE_BUSES.find((bus) => bus.id === selectedId) ?? ACTIVE_BUSES[0];

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">Track Bus</h1>
        <p className="mt-1 text-sm text-slate-500">
          Follow any active SmartTransit bus on its route in real time.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-base font-semibold text-navy-950">
                  {selectedBus.busNumber} · {selectedBus.route}
                </p>
              </div>
              <StatusBadge status={selectedBus.status} />
            </div>

            <div className="mt-4">
              <BusMap bus={selectedBus} tracking={tracking} onTrackLive={() => setTracking(true)} />
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
                <MapPinIcon size={18} />
              </span>
              <div>
                <p className="text-xs text-slate-400">Current Stop</p>
                <p className="text-sm font-semibold text-navy-950">{selectedBus.currentStop}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <BusIcon size={18} />
              </span>
              <div>
                <p className="text-xs text-slate-400">Next Stop</p>
                <p className="text-sm font-semibold text-navy-950">{selectedBus.nextStop}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <ClockIcon size={18} />
              </span>
              <div>
                <p className="text-xs text-slate-400">Estimated Arrival</p>
                <p className="text-sm font-semibold text-navy-950">{selectedBus.eta}</p>
              </div>
            </Card>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <InfoIcon size={16} className="mt-0.5 shrink-0" />
            This is sample tracking data for demonstration. Once GPS hardware and a backend are
            connected, this page will show each bus's real location. Last updated:{" "}
            {selectedBus.lastUpdated}.
          </div>
        </div>

        <Card className="h-fit p-4 sm:p-5">
          <p className="font-display text-sm font-semibold text-navy-950">Active Buses</p>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search bus number or route..."
            className="mt-3"
          />
          <div className="mt-3 space-y-2">
            {filteredBuses.map((bus) => {
              const active = bus.id === selectedId;
              return (
                <button
                  key={bus.id}
                  onClick={() => {
                    setSelectedId(bus.id);
                    setTracking(false);
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    active
                      ? "border-navy-800 bg-navy-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-navy-950">{bus.busNumber}</span>
                    <StatusBadge status={bus.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{bus.route}</p>
                  <p className="mt-1 text-xs font-medium text-teal-700">ETA {bus.eta}</p>
                </button>
              );
            })}
            {filteredBuses.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-500">No buses match your search.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function TrackBusPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return (
      <DashboardLayout>
        <TrackBusContent />
      </DashboardLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container-page py-10 sm:py-14">
        <TrackBusContent />
      </div>
    </PublicLayout>
  );
}
