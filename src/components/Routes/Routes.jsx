import { useMemo, useState } from 'react'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'

// ---- helpers -------------------------------------------------------------

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

// ---- trend badge ----------------------------------------------------------

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
    ? 'text-gray-500'
    : isUp
      ? 'text-emerald-400'
      : 'text-rose-400'

  return (
    <span
      className={`inline-flex items-center gap-1 text-[0.95rem] font-semibold ${color}`}
    >
      <Icon size={16} strokeWidth={2.5} />

      {isFlat
        ? '0%'
        : `${isUp ? '+' : ''}${trend}%`}
    </span>
  )
}

// ---- stat cards -----------------------------------------------------------

function RouteStatCard({ stat }) {
  return (
    <article className="rounded-xl bg-[#0f1729] px-5 py-4 shadow-sm border border-white/5">
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

// ---- peak hours -----------------------------------------------------------

function PeakHoursCard() {
  return (
    <article className="rounded-xl bg-[#0f1729] px-5 py-4 shadow-sm border border-white/5">
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

    if (!q) {
      return parsed
    }

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
    setSortDir((current) =>
      current === 'asc' ? 'desc' : 'asc'
    )
  }

  return (
    <section className="rounded-xl bg-[#0f1729] p-5 shadow-sm border border-white/5">

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

        {/* Search only - Export removed */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
      <div className="mt-4 flex items-center gap-4 text-[0.85rem] text-gray-400">

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
  const max = Math.max(
    ...hours.map((h) => h.value)
  )

  return (
    <section className="rounded-xl bg-[#0f1729] p-5 shadow-sm border border-white/5">

      <div className="mb-4">
        <h2 className="text-[1.5rem] font-bold text-white">
          Peak Demand Hours
        </h2>

        <p className="text-[0.9rem] text-gray-400">
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
              <div className="h-3.5 rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full ${
                    isPeak
                      ? 'bg-[#3b82f6]'
                      : 'bg-[#f4c400]'
                  }`}
                  style={{
                    width: `${hour.value * 100}%`,
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
    <section className="rounded-2xl bg-[#0a0e1a] p-4">


      <header className="mb-4 flex items-center rounded-xl bg-[#0f1729] px-5 py-4 shadow-sm border border-white/5">
        <div>
          <h1 className="text-[1.75rem] font-bold text-white">
            Analytical Reports
          </h1>

          <p className="text-[0.9rem] text-gray-400">
            Route performance and demand insights
          </p>
        </div>
      </header>


      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {routeStats
          .filter(
            (stat) => stat.label !== 'Peak Hours'
          )
          .map((stat) => (
            <RouteStatCard
              key={stat.label}
              stat={stat}
            />
          ))}

        {/* Peak Hours - only one card */}
        <PeakHoursCard />

      </div>


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