import { ChevronDown } from 'lucide-react'

function RouteStatCard({ stat }) {
  return (
    <article className="rounded-xl bg-white px-4 py-3 text-center shadow-sm">
      <p
        className={`mb-1 text-lg font-bold sm:text-2xl md:text-[1.8rem] ${
          stat.highlight ? 'text-[#0f8eb1]' : 'text-[#9ca3af]'
        }`}
      >
        {stat.label}
      </p>
      <p className="text-xl leading-tight text-gray-800 sm:text-2xl md:text-[2rem]">
        {stat.value}
      </p>
    </article>
  )
}

function RouteAdherenceTable({ rows }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-xl font-bold text-gray-900 sm:text-2xl md:text-[2.15rem]">
        Driver Route Adherence
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm sm:text-base md:text-[1.5rem]">
          <thead>
            <tr className="bg-gray-200 text-left text-gray-900">
              <th className="px-3 py-2 font-semibold">Driver</th>
              <th className="px-3 py-2 font-semibold">Bus-ID</th>
              <th className="px-3 py-2 font-semibold">Trip</th>
              <th className="px-3 py-2 text-right font-semibold">Adherence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${row.driver}-${row.busId}`}
                className={index % 2 === 0 ? 'bg-[#ededed]' : 'bg-[#d9d9d9]'}
              >
                <td className="px-3 py-2 text-gray-700">{row.driver}</td>
                <td className="px-3 py-2 text-gray-700">{row.busId}</td>
                <td className="px-3 py-2 text-gray-700">{row.trip}</td>
                <td className="px-3 py-2 text-right text-gray-700">
                  {row.adherence}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PeakDemandHours({ hours }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl md:text-[2.15rem]">
        Peak Demand Hours
      </h2>
      <div className="space-y-2">
        {hours.map((hour) => (
          <div
            key={hour.label}
            className="grid grid-cols-[minmax(4.5rem,1fr)_3fr] items-center gap-3 sm:gap-4"
          >
            <p className="text-sm text-gray-700 sm:text-base md:text-[1.5rem]">
              {hour.label}
            </p>
            <div className="h-3 rounded-full bg-[#dbdee2]">
              <div
                className="h-full rounded-full bg-[#f4c400]"
                style={{ width: `${hour.value * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function RoutesPanel({ routeStats, routeAdherenceRows, peakDemandHours }) {
  return (
    <section className="rounded-2xl bg-[#efefef] p-3 sm:p-4">
      <header className="mb-4 rounded-xl bg-white px-4 py-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl md:text-[2.35rem]">
          Analytical Reports
        </h1>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {routeStats.map((stat) => (
          <RouteStatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <RouteAdherenceTable rows={routeAdherenceRows} />
        <PeakDemandHours hours={peakDemandHours} />
      </div>
    </section>
  )
}