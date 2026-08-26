import { useMemo, useState } from 'react'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'

// ---- helpers -------------------------------------------------------------

function adherenceTone(value) {
  if (value >= 90) {
    return {
      text: 'text-emerald-700',
      bg: 'bg-emerald-100',
      bar: 'bg-emerald-500',
    }
  }

  if (value >= 80) {
    return {
      text: 'text-amber-700',
      bg: 'bg-amber-100',
      bar: 'bg-amber-500',
    }
  }

  return {
    text: 'text-rose-700',
    bg: 'bg-rose-100',
    bar: 'bg-rose-500',
  }
}

function TrendBadge({ trend }) {
  if (trend === undefined || trend === null) return null

  const isUp = trend > 0
  const isFlat = trend === 0

  const Icon = isFlat
    ? Minus
    : isUp
      ? TrendingUp
      : TrendingDown

  const color = isFlat
    ? 'text-gray-400'
    : isUp
      ? 'text-emerald-600'
      : 'text-rose-600'

  return (
    <span
      className={`inline-flex items-center gap-1 text-[0.95rem] font-semibold ${color}`}
    >
      <Icon size={16} strokeWidth={2.5} />

      {isFlat ? '0%' : `${isUp ? '+' : ''}${trend}%`}
    </span>
  )
}

// ---- stat cards -----------------------------------------------------------

function RouteStatCard({ stat }) {
  return (
    <article className="rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-gray-100">
      <div className="mb-2 flex items-center justify-between">
        <p
          className={`text-[1.05rem] font-bold tracking-tight ${
            stat.highlight
              ? 'text-[#0f8eb1]'
              : 'text-[#9ca3af]'
          }`}
        >
          {stat.label}
        </p>

        <TrendBadge trend={stat.trend} />
      </div>

      <p className="text-[2rem] font-semibold leading-tight text-gray-800">
        {stat.value}
      </p>
    </article>
  )
}

// ---- Peak Hours -----------------------------------------------------------

function PeakHoursCard({ label = 'Peak Hours' }) {
  const times = ['6-8 AM', '4-6 PM']

  return (
    <article className="rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-gray-100">
      <p className="mb-3 text-[1.05rem] font-bold tracking-tight text-[#9ca3af]">
        {label}
      </p>

      <div className="flex flex-col gap-2">
        {times.map((time) => (
          <span
            key={time}
            className="w-fit rounded-full bg-gray-100 px-3 py-1.5 text-[0.9rem] font-semibold text-gray-700"
          >
            {time}
          </span>
        ))}
      </div>
    </article>
  )
}

// ---- adherence table ------------------------------------------------------

function RouteAdherenceTable({ rows }) {
  const [sortDir, setSortDir] = useState('asc')
  const [query, setQuery] = useState('')

  const parsed = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        adherenceNum: parseFloat(r.adherence),
      })),
    [rows]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    if (!q) return parsed

    return parsed.filter(
      (r) =>
        r.driver.toLowerCase().includes(q) ||
        r.busId.toLowerCase().includes(q) ||
        r.trip.toLowerCase().includes(q)
    )
  }, [parsed, query])

  const sorted = useMemo(() => {
    const copy = [...filtered]

    copy.sort((a, b) =>
      sortDir === 'asc'
        ? a.adherenceNum - b.adherenceNum
        : b.adherenceNum - a.adherenceNum
    )

    return copy
  }, [filtered, sortDir])

  const toggleSort = () => {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
  }

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[1.5rem] font-bold text-gray-900">
            Driver Route Adherence
          </h2>

          <p className="text-[0.9rem] text-gray-500">
            Last 7 days · {sorted.length} drivers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search driver, bus, trip"
            className="w-48 rounded-lg border border-gray-200 px-3 py-1.5 text-[0.9rem] text-gray-700 outline-none focus:border-[#0f8eb1] focus:ring-1 focus:ring-[#0f8eb1]"
          />

          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-[#0f8eb1] px-3 py-1.5 text-[0.9rem] font-semibold text-white transition-colors hover:bg-[#0c7794]"
          >
            <Download size={15} />
            Export
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-[1rem]">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-3 py-2 text-[0.85rem] font-semibold uppercase tracking-wide">
                Driver
              </th>

              <th className="px-3 py-2 text-[0.85rem] font-semibold uppercase tracking-wide">
                Bus-ID
              </th>

              <th className="px-3 py-2 text-[0.85rem] font-semibold uppercase tracking-wide">
                Trip
              </th>

              <th className="px-3 py-2 text-right text-[0.85rem] font-semibold uppercase tracking-wide">
                <button
                  type="button"
                  onClick={toggleSort}
                  className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800"
                >
                  Adherence

                  {sortDir === 'asc' ? (
                    <ArrowUp size={13} />
                  ) : sortDir === 'desc' ? (
                    <ArrowDown size={13} />
                  ) : (
                    <ArrowUpDown size={13} />
                  )}
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((row) => {
              const tone = adherenceTone(row.adherenceNum)

              return (
                <tr
                  key={`${row.driver}-${row.busId}`}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-3 py-2.5 font-medium text-gray-800">
                    {row.driver}
                  </td>

                  <td className="px-3 py-2.5 text-gray-500">
                    {row.busId}
                  </td>

                  <td className="px-3 py-2.5 text-gray-500">
                    {row.trip}
                  </td>

                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={`inline-block min-w-[3.5rem] rounded-full px-2.5 py-1 text-center text-[0.9rem] font-bold ${tone.text} ${tone.bg}`}
                    >
                      {row.adherence}
                    </span>
                  </td>
                </tr>
              )
            })}

            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-gray-400"
                >
                  No drivers match "{query}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-4 text-[0.85rem] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          90%+
        </span>

        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          80–89%
        </span>

        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          Below 80%
        </span>
      </div>
    </section>
  )
}

// ---- peak demand hours ----------------------------------------------------

function PeakDemandHours({ hours }) {
  const max = Math.max(...hours.map((h) => h.value))

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="mb-4">
        <h2 className="text-[1.5rem] font-bold text-gray-900">
          Peak Demand Hours
        </h2>

        <p className="text-[0.9rem] text-gray-500">
          Passengers by time block, today
        </p>
      </div>

      <div className="space-y-3">
        {hours.map((hour) => {
          const isPeak = hour.value === max

          return (
            <div
              key={hour.label}
              className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-3"
            >
              <p
                className={`text-[0.95rem] ${
                  isPeak
                    ? 'font-bold text-gray-900'
                    : 'text-gray-600'
                }`}
              >
                {hour.label}
              </p>

              <div className="h-3.5 rounded-full bg-[#e9ebee]">
                <div
                  className={`h-full rounded-full ${
                    isPeak
                      ? 'bg-[#0f8eb1]'
                      : 'bg-[#f4c400]'
                  }`}
                  style={{
                    width: `${hour.value * 100}%`,
                  }}
                />
              </div>

              <p
                className={`text-right text-[0.9rem] tabular-nums ${
                  isPeak
                    ? 'font-bold text-gray-900'
                    : 'text-gray-500'
                }`}
              >
                {hour.passengers ??
                  `${Math.round(hour.value * 100)}%`}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ---- page -----------------------------------------------------------------

export default function RoutesPanel({
  routeStats,
  routeAdherenceRows,
  peakDemandHours,
}) {
  return (
    <section className="rounded-2xl bg-[#efefef] p-4">

      {/* Header */}
      <header className="mb-4 flex items-center justify-between rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-gray-100">
        <div>
          <h1 className="text-[1.75rem] font-bold text-gray-900">
            Analytical Reports
          </h1>

          <p className="text-[0.9rem] text-gray-500">
            Route performance and demand insights
          </p>
        </div>

        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[0.9rem] font-semibold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <Download size={15} />
          Export report
        </button>
      </header>

      {/* Top Statistics */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* Normal statistics */}
        {routeStats
          .filter((stat) => stat.label !== 'Peak Hours')
          .map((stat) => (
            <RouteStatCard
              key={stat.label}
              stat={stat}
            />
          ))}

        {/* Only one Peak Hours card */}
        <PeakHoursCard label="Peak Hours" />

      </div>

      {/* Main Report Sections */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">

        <RouteAdherenceTable
          rows={routeAdherenceRows}
        />

        <PeakDemandHours
          hours={peakDemandHours}
        />

      </div>
    </section>
  )
}

// ---- demo data ------------------------------------------------------------

export function RoutesPanelDemo() {

  const routeStats = [
    {
      label: 'Total Trips',
      value: 13,
      trend: 8,
      highlight: false,
    },
    {
      label: 'Avg Daily Passengers',
      value: 400,
      trend: 3,
      highlight: false,
    },
    {
      label: 'Route Adherence',
      value: '90%',
      trend: -2,
      highlight: false,
    },
  ]

  const routeAdherenceRows = [
    {
      driver: 'R. Llanes',
      busId: 'B-106',
      trip: 'Boston',
      adherence: '78%',
    },
    {
      driver: 'J. Licong',
      busId: 'B-107',
      trip: 'Cateel',
      adherence: '80%',
    },
    {
      driver: 'E. Ang',
      busId: 'B-110',
      trip: 'Digos',
      adherence: '82%',
    },
    {
      driver: 'J. Galo',
      busId: 'B-105',
      trip: 'Mati',
      adherence: '88%',
    },
    {
      driver: 'J. Maunas',
      busId: 'B-102',
      trip: 'Carmen',
      adherence: '90%',
    },
    {
      driver: 'R. Ababa',
      busId: 'B-103',
      trip: 'Santo Tomas',
      adherence: '91%',
    },
  ]

  const peakDemandHours = [
    {
      label: '4-6 AM',
      value: 0.8,
      passengers: '80%',
    },
    {
      label: '6-8 AM',
      value: 1.0,
      passengers: '100%',
    },
    {
      label: '8-10 AM',
      value: 0.95,
      passengers: '95%',
    },
    {
      label: '10-12 PM',
      value: 0.83,
      passengers: '83%',
    },
    {
      label: '12-2 PM',
      value: 0.66,
      passengers: '66%',
    },
    {
      label: '2-4 PM',
      value: 0.76,
      passengers: '76%',
    },
    {
      label: '4-6 PM',
      value: 1.0,
      passengers: '100%',
    },
    {
      label: '6-8 PM',
      value: 0.9,
      passengers: '90%',
    },
    {
      label: '8-10 PM',
      value: 0.7,
      passengers: '70%',
    },
  ]

  return (
    <div className="min-h-screen bg-[#f7f7f8] p-6">
      <RoutesPanel
        routeStats={routeStats}
        routeAdherenceRows={routeAdherenceRows}
        peakDemandHours={peakDemandHours}
      />
    </div>
  )
}