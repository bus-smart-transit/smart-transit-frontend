import { useState } from 'react'
import { Plus } from 'lucide-react'
import AddTripModal from './AddTrip'

function StatCard({ label, value, highlight = false }) {
  return (
    <article className="flex flex-col items-center justify-center rounded-xl bg-[#131a2e] px-6 py-8 shadow-sm">
      <p className="mb-2 text-sm text-gray-400">{label}</p>
      <p
        className={`text-xl font-semibold ${
          highlight ? 'text-[#4d8eff]' : 'text-gray-100'
        }`}
      >
        {value}
      </p>
    </article>
  )
}

export default function SchedulePanel({ scheduleStats, initialTrips, staff }) {
  const [trips, setTrips] = useState(initialTrips)
  const [showAddTrip, setShowAddTrip] = useState(false)

  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  function handleAddTrip(trip) {
    setTrips((prev) => [...prev, trip])
  }

  return (
    <>
      <header className="flex items-center justify-between rounded-xl bg-[#131a2e] px-8 py-5 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-100">Trip Schedule</h1>
        <p className="text-sm text-gray-400">{formattedDate}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {scheduleStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className="rounded-xl bg-[#131a2e] p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-100">Schedule</h2>
          <button
            type="button"
            onClick={() => setShowAddTrip(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#4d8eff]/40 bg-transparent px-4 py-2 text-sm font-medium text-[#4d8eff] transition-colors hover:bg-[#4d8eff]/10"
          >
            <Plus className="h-4 w-4" />
            Add Trip
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#0d1220]">
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Bus ID
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">
                  Route
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">
                  Driver
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">
                  Chauffeur
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Departure Time
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Type Of Service
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip, index) => (
                <tr
                  key={`${trip.busId}-${index}`}
                  className={index % 2 === 0 ? 'bg-[#131a2e]' : 'bg-[#0f1526]'}
                >
                  <td className="px-4 py-3 text-center text-gray-300">{trip.busId}</td>
                  <td className="px-4 py-3 text-left text-gray-300">{trip.route}</td>
                  <td className="px-4 py-3 text-left text-gray-300">{trip.driver}</td>
                  <td className="px-4 py-3 text-left text-gray-300">{trip.chauffeur}</td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {trip.departureTime}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {trip.serviceType}
                  </td>
                  <td className={`px-4 py-3 text-center font-medium ${
                    trip.status === 'Ongoing' ? 'text-[#4d8eff]' : 'text-gray-300'
                  }`}>
                    {trip.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showAddTrip ? (
        <AddTripModal
          onClose={() => setShowAddTrip(false)}
          onAdd={handleAddTrip}
          staff={staff}
        />
      ) : null}
    </>
  )
}