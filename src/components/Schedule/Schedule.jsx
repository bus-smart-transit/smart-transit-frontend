import { useState } from 'react'
import { Plus } from 'lucide-react'
import AddTripModal from './AddTrip'

function StatCard({ label, value, highlight = false }) {
  return (
    <article className="flex flex-col items-center justify-center rounded-xl bg-white px-4 py-6 shadow-sm sm:px-6 sm:py-8">
      <p className="mb-2 text-xs text-gray-500 sm:text-sm">{label}</p>
      <p
        className={`text-lg font-semibold sm:text-xl ${
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
      <header className="flex flex-col gap-1 rounded-xl bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-8 sm:py-5">
        <h1 className="text-xl font-bold text-gray-800 sm:text-2xl">Trip Schedule</h1>
        <p className="text-xs text-gray-500 sm:text-sm">{formattedDate}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {scheduleStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <h2 className="text-base font-bold text-gray-800 sm:text-lg">Schedule</h2>
          <button
            type="button"
            onClick={() => setShowAddTrip(true)}
            className="inline-flex items-center justify-center gap-1.5 self-start rounded-lg border border-[#00a8cc]/40 bg-white px-4 py-2 text-sm font-medium text-[#00a8cc] transition-colors hover:bg-[#00a8cc]/5 sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Add Trip
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-3 text-center font-semibold text-gray-700 sm:px-4">
                  Bus ID
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700 sm:px-4">
                  Route
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700 sm:px-4">
                  Driver
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700 sm:px-4">
                  Chauffeur
                </th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700 sm:px-4">
                  Departure Time
                </th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700 sm:px-4">
                  Type Of Service
                </th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700 sm:px-4">
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
                  <td className="px-3 py-3 text-center text-gray-700 sm:px-4">
                    {trip.busId}
                  </td>
                  <td className="px-3 py-3 text-left text-gray-700 sm:px-4">
                    {trip.route}
                  </td>
                  <td className="px-3 py-3 text-left text-gray-700 sm:px-4">
                    {trip.driver}
                  </td>
                  <td className="px-3 py-3 text-left text-gray-700 sm:px-4">
                    {trip.chauffeur}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-700 sm:px-4">
                    {trip.departureTime}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-700 sm:px-4">
                    {trip.serviceType}
                  </td>
                  <td className="px-3 py-3 text-center font-medium text-gray-700 sm:px-4">
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