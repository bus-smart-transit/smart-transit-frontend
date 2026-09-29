import { useMemo, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import PublicLayout from "../../components/PublicLayout.jsx";
import MapView from "../../components/MapView.jsx";
import Card from "../../components/ui/Card.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import SearchBar from "../../components/ui/SearchBar.jsx";
import { BusIcon, MapPinIcon, ClockIcon, InfoIcon } from "../../components/Icons.jsx";
import { ACTIVE_BUSES } from "../../data/sampleData.js";
import { useAuth } from "../../context/AuthContext.jsx";

function TrackBusContent() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(ACTIVE_BUSES[0].id);

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
              <div className="h-72 overflow-hidden rounded-2xl bg-navy-900 sm:h-96">
                <MapView />
              </div>
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
                  onClick={() => setSelectedId(bus.id)}
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
