const statusStyles = {
  Arrived: 'text-gray-700',
  Ongoing: 'text-gray-700',
  Upcoming: 'text-gray-700',
}

function StatCard({ label, value, highlight = false }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-white px-6 py-8 shadow-sm">
      <p className="mb-2 text-sm text-gray-500">{label}</p>
      <p
        className={`text-xl font-semibold ${
          highlight ? 'text-[#00a8cc]' : 'text-gray-800'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function TripsTable({ trips }) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-bold text-gray-800">Trips Today</h2>

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
                <td className="px-4 py-3 text-center text-gray-700">
                  {trip.busId}
                </td>
                <td className="px-4 py-3 text-left text-gray-700">
                  {trip.route}
                </td>
                <td className="px-4 py-3 text-center text-gray-700">
                  {trip.departureTime}
                </td>
                <td className="px-4 py-3 text-center text-gray-700">
                  {trip.serviceType}
                </td>
                <td
                  className={`px-4 py-3 text-center font-medium ${statusStyles[trip.status]}`}
                >
                  {trip.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function DashboardHeader({
  title = 'Dashboard',
  stats = [],
  trips = [],
  isDashboardView = false,
}) {
  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <>
      <header className="flex items-center justify-between rounded-xl bg-white px-8 py-5 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        <p className="text-sm text-gray-500">{formattedDate}</p>
      </header>

      {isDashboardView ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

          <TripsTable trips={trips} />
        </>
      ) : null}
    </>
  )
}
