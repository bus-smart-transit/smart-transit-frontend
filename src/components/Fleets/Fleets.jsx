import { useState } from 'react'
import { Bus } from 'lucide-react'
import FleetMapView from './FleetMapView'

function FleetTripCard({ trip, onViewMap }) {
  return (
    <article className="rounded-2xl bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
      <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#dfe1e4] px-4 py-3">
        <Bus className="h-9 w-9 text-[#1e88e5]" strokeWidth={1.75} />
        <div className="text-gray-800">
          <p className="text-xl font-semibold leading-tight">{trip.route}</p>
          <p className="text-sm">{trip.busId}</p>
          <p className="text-sm">{trip.departureTime}</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-1 flex justify-end">
          <span className="text-xs font-semibold text-[#1e88e5]">{trip.status}</span>
        </div>
        <div className="h-4 rounded-full bg-[#dfe1e4] p-0.5">
          <div
            className="h-full rounded-full bg-[#3b82f6]"
            style={{ width: `${trip.progress * 100}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onViewMap(trip)}
        className="w-full rounded-full bg-[#dfe1e4] py-1.5 text-lg font-semibold text-gray-900"
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
    <section className="rounded-2xl border border-gray-300 bg-[#efefef] p-4 shadow-sm">
      <h2 className="mb-4 text-[2rem] font-bold text-gray-900">Fleets Trips</h2>

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