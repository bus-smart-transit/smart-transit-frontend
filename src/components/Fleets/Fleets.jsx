import { useState } from 'react'
import { Bus } from 'lucide-react'
import FleetMapView from './FleetMapView'

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

export default function FleetsPanel({ fleetTrips }) {
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