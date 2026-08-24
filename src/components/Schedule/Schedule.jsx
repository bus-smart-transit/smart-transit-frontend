import { useState } from 'react'
import { Plus } from 'lucide-react'
import AddTripModal from './AddTrip'

function StatCard({ label, value, highlight = false }) {
  return (
    <article className="flex flex-col items-center justify-center rounded-xl bg-white px-6 py-8 shadow-sm">
      <p className="mb-2 text-sm text-gray-500">{label}</p>
      <p
        className={`text-xl font-semibold ${
          highlight ? 'text-[#00a8cc]' : 'text-gray-800'
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
      <header className="flex items-center justify-between rounded-xl bg-white px-8 py-5 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Trip Schedule</h1>
        <p className="text-sm text-gray-500">{formattedDate}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {scheduleStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Schedule</h2>
          <button
            type="button"
            onClick={() => setShowAddTrip(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#00a8cc]/40 bg-white px-4 py-2 text-sm font-medium text-[#00a8cc] transition-colors hover:bg-[#00a8cc]/5"
          >
            <Plus className="h-4 w-4" />
            Add Trip
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-3 text-center font-semibold text-gray-700">
                  Bus ID
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Route
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Driver
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Chauffeur
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">
                  Departure Time
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">
                  Type Of Service
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip, index) => (
                <tr
                  key={`${trip.busId}-${index}`}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-4 py-3 text-center text-gray-700">{trip.busId}</td>
                  <td className="px-4 py-3 text-left text-gray-700">{trip.route}</td>
                  <td className="px-4 py-3 text-left text-gray-700">{trip.driver}</td>
                  <td className="px-4 py-3 text-left text-gray-700">{trip.chauffeur}</td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {trip.departureTime}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {trip.serviceType}
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-gray-700">
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