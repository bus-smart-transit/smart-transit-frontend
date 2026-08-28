const statusStyles = {
  Arrived: 'text-gray-300',
  Ongoing: 'text-blue-400',
  Upcoming: 'text-gray-300',
}

function StatCard({ label, value, highlight = false }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-[#0f1729] px-6 py-8 shadow-sm border border-white/5">
      <p className="mb-2 text-sm text-gray-400">{label}</p>
      <p
        className={`text-xl font-semibold ${
          highlight ? 'text-[#3b82f6]' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function TripsTable({ trips }) {
  return (
    <section className="rounded-xl bg-[#0f1729] p-6 shadow-sm border border-white/5">
      <h2 className="mb-5 text-lg font-bold text-white">Trips Today</h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-white/5">
              <th className="px-4 py-3 text-center font-semibold text-gray-300">
                Bus ID
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-300">
                Route
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
                className={index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.03]'}
              >
                <td className="px-4 py-3 text-center text-gray-300">
                  {trip.busId}
                </td>
                <td className="px-4 py-3 text-left text-gray-300">
                  {trip.route}
                </td>
                <td className="px-4 py-3 text-center text-gray-300">
                  {trip.departureTime}
                </td>
                <td className="px-4 py-3 text-center text-gray-300">
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
      <header className="flex items-center justify-between rounded-xl bg-[#0f1729] px-8 py-5 shadow-sm border border-white/5">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="text-sm text-gray-400">{formattedDate}</p>
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