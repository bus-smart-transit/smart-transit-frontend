const statusStyles = {
  Arrived: 'text-gray-700',
  Ongoing: 'text-gray-700',
  Upcoming: 'text-gray-700',
}

function StatCard({ label, value, highlight = false }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-white px-4 py-6 shadow-sm sm:px-6 sm:py-8">
      <p className="mb-2 text-xs text-gray-500 sm:text-sm">{label}</p>
      <p
        className={`text-lg font-semibold sm:text-xl ${
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
    <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
      <h2 className="mb-4 text-base font-bold text-gray-800 sm:mb-5 sm:text-lg">
        Trips Today
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-3 text-center font-semibold text-gray-700 sm:px-4">
                Bus ID
              </th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 sm:px-4">
                Route
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
                <td className="px-3 py-3 text-center text-gray-700 sm:px-4">
                  {trip.departureTime}
                </td>
                <td className="px-3 py-3 text-center text-gray-700 sm:px-4">
                  {trip.serviceType}
                </td>
                <td
                  className={`px-3 py-3 text-center font-medium sm:px-4 ${statusStyles[trip.status]}`}
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
      <header className="flex flex-col gap-1 rounded-xl bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-8 sm:py-5">
        <h1 className="text-xl font-bold text-gray-800 sm:text-2xl">{title}</h1>
        <p className="text-xs text-gray-500 sm:text-sm">{formattedDate}</p>
      </header>

      {isDashboardView ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
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