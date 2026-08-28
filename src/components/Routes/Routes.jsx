import { useMemo, useState } from 'react'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function adherenceTone(value) {
  if (value >= 90) {
    return {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      bar: 'bg-emerald-500',
    }
  }

  if (value >= 80) {
    return {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      bar: 'bg-amber-500',
    }
  }

  return {
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    bar: 'bg-rose-500',
  }
}

// -----------------------------------------------------------------------------
// Trend Badge
// -----------------------------------------------------------------------------

function TrendBadge({ trend }) {
  if (trend === undefined || trend === null) {
    return null
  }

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
      ? 'text-emerald-400'
      : 'text-rose-400'

  return (
    <span
      className={`inline-flex items-center gap-1 text-[0.95rem] font-semibold ${color}`}
    >
      <Icon size={16} strokeWidth={2.5} />

      {isFlat ? '0%' : `${isUp ? '+' : ''}${trend}%`}
    </span>
  )
}

// -----------------------------------------------------------------------------
// Stat Card
// -----------------------------------------------------------------------------

function RouteStatCard({ stat }) {
  return (
    <article className="rounded-xl border border-white/5 bg-[#0f1729] px-5 py-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p
          className={`text-[1.05rem] font-bold tracking-tight ${
            stat.highlight
              ? 'text-[#3b82f6]'
              : 'text-gray-400'
          }`}
        >
          {stat.label}
        </p>

        <TrendBadge trend={stat.trend} />
      </div>

      <p className="text-[2rem] font-semibold leading-tight text-white">
        {stat.value}
      </p>
    </article>
  )
}

// -----------------------------------------------------------------------------
// Peak Hours Card
// -----------------------------------------------------------------------------

function PeakHoursCard() {
  return (
    <article className="rounded-xl border border-white/5 bg-[#0f1729] px-5 py-4 shadow-sm">
      <p className="mb-3 text-[1.05rem] font-bold tracking-tight text-gray-400">
        Peak Hours
      </p>

      <div className="flex flex-col gap-2">
        <span className="w-fit rounded-full bg-white/5 px-3 py-1.5 text-[0.9rem] font-semibold text-gray-300">
          6-8 AM
        </span>

        <span className="w-fit rounded-full bg-white/5 px-3 py-1.5 text-[0.9rem] font-semibold text-gray-300">
          4-6 PM
        </span>
      </div>
    </article>
  )
}

// -----------------------------------------------------------------------------
// Route Adherence Table
// -----------------------------------------------------------------------------

function RouteAdherenceTable({ rows = [] }) {
  const [sortDir, setSortDir] = useState('asc')
  const [query, setQuery] = useState('')

  const parsed = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        adherenceNum: parseFloat(row.adherence) || 0,
      })),
    [rows]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    if (!q) {
      return parsed
    }

    return parsed.filter((row) => {
      const driver = String(row.driver ?? '').toLowerCase()
      const busId = String(row.busId ?? '').toLowerCase()
      const trip = String(row.trip ?? '').toLowerCase()

      return (
        driver.includes(q) ||
        busId.includes(q) ||
        trip.includes(q)
      )
    })
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
    setSortDir((current) =>
      current === 'asc' ? 'desc' : 'asc'
    )
  }

  return (
    <section className="rounded-xl border border-white/5 bg-[#0f1729] p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[1.5rem] font-bold text-white">
            Driver Route Adherence
          </h2>

          <p className="text-[0.9rem] text-gray-400">
            Last 7 days · {sorted.length} drivers
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search driver, bus, trip"
            className="w-48 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[0.9rem] text-white placeholder:text-gray-500 outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-[1rem]">
          <thead>
            <tr className="border-b border-white/10 text-left text-gray-400">
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
                  className="inline-flex items-center gap-1 text-gray-400 hover:text-white"
                  aria-label="Sort adherence"
                >
                  Adherence

                  {sortDir === 'asc' ? (
                    <ArrowUp size={13} />
                  ) : (
                    <ArrowDown size={13} />
                  )}
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((row, index) => {
              const tone = adherenceTone(row.adherenceNum)

              return (
                <tr
                  key={`${row.driver}-${row.busId}-${index}`}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-3 py-2.5 font-medium text-white">
                    {row.driver}
                  </td>

                  <td className="px-3 py-2.5 text-gray-400">
                    {row.busId}
                  </td>

                  <td className="px-3 py-2.5 text-gray-400">
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
                  className="px-3 py-6 text-center text-gray-500"
                >
                  No drivers match "{query}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-[0.85rem] text-gray-400">
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

// -----------------------------------------------------------------------------
// Peak Demand Hours
// -----------------------------------------------------------------------------

function PeakDemandHours({ hours = [] }) {
  if (hours.length === 0) {
    return (
      <section className="rounded-xl border border-white/5 bg-[#0f1729] p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-[1.5rem] font-bold text-white">
            Peak Demand Hours
          </h2>

          <p className="text-[0.9rem] text-gray-400">
            Passengers by time block, today
          </p>
        </div>

        <p className="text-gray-500">
          No demand data available.
        </p>
      </section>
    )
  }

  const max = Math.max(
    ...hours.map((hour) => Number(hour.value) || 0)
  )

  return (
    <section className="rounded-xl border border-white/5 bg-[#0f1729] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-[1.5rem] font-bold text-white">
          Peak Demand Hours
        </h2>

        <p className="text-[0.9rem] text-gray-400">
          Passengers by time block, today
        </p>
      </div>

      <div className="space-y-3">
        {hours.map((hour, index) => {
          const value = Number(hour.value) || 0
          const isPeak = value === max

          return (
            <div
              key={`${hour.label}-${index}`}
              className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-3"
            >
              {/* Time */}
              <p
                className={`text-[0.95rem] ${
                  isPeak
                    ? 'font-bold text-white'
                    : 'text-gray-400'
                }`}
              >
                {hour.label}
              </p>

              {/* Progress bar */}
              <div className="h-3.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full ${
                    isPeak
                      ? 'bg-[#3b82f6]'
                      : 'bg-[#f4c400]'
                  }`}
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(value * 100, 100)
                    )}%`,
                  }}
                />
              </div>

              {/* Percentage */}
              <p
                className={`text-right text-[0.9rem] tabular-nums ${
                  isPeak
                    ? 'font-bold text-white'
                    : 'text-gray-400'
                }`}
              >
                {hour.passengers ??
                  `${Math.round(value * 100)}%`}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// -----------------------------------------------------------------------------
// Main Routes Panel
// -----------------------------------------------------------------------------

export default function RoutesPanel({
  routeStats = [],
  routeAdherenceRows = [],
  peakDemandHours = [],
}) {
  return (
    <section className="rounded-2xl bg-[#0a0e1a] p-4">
      {/* Page Header */}
      <header className="mb-4 flex items-center rounded-xl border border-white/5 bg-[#0f1729] px-5 py-4 shadow-sm">
        <div>
          <h1 className="text-[1.75rem] font-bold text-white">
            Analytical Reports
          </h1>

          <p className="text-[0.9rem] text-gray-400">
            Route performance and demand insights
          </p>
        </div>
      </header>

      {/* Statistics */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {routeStats
          .filter((stat) => stat.label !== 'Peak Hours')
          .map((stat) => (
            <RouteStatCard
              key={stat.label}
              stat={stat}
            />
          ))}

        {/* Peak Hours */}
        <PeakHoursCard />
      </div>

      {/* Reports */}
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

// -----------------------------------------------------------------------------
// Demo Data
// -----------------------------------------------------------------------------

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
    <div className="min-h-screen bg-[#0a0e1a] p-6">
      <RoutesPanel
        routeStats={routeStats}
        routeAdherenceRows={routeAdherenceRows}
        peakDemandHours={peakDemandHours}
      />
    </div>
  )
}