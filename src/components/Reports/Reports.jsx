import { useState, useMemo } from 'react'
import { Calendar } from 'lucide-react'

// ---------------------------------------------------------------------------
// Mock data — trips keyed by date (YYYY-MM-DD). Swap this for a real fetch.
// ---------------------------------------------------------------------------

const routePool = [
  { route: 'Davao City - Cateel', serviceType: 'Aircon' },
  { route: 'Davao City - Tagum City', serviceType: 'Non-Aircon' },
  { route: 'Davao City - Digos City', serviceType: 'Aircon' },
  { route: 'Davao City - Mati City', serviceType: 'Aircon' },
  { route: 'Davao City - Boston', serviceType: 'Aircon' },
  { route: 'Davao City - Carmen', serviceType: 'Non-Aircon' },
  { route: 'Davao City - Malita', serviceType: 'Non-Aircon' },
  { route: 'Davao City - Santo Tomas', serviceType: 'Aircon' },
]

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function seededRandom(seed) {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Generates a deterministic-but-varied schedule for any given date so every
// day the user picks on the calendar has data to show.
function generateTripsForDate(dateKey) {
  const seed = dateKey.split('-').reduce((acc, part) => acc + Number(part), 0)
  const random = seededRandom(seed * 97 + 13)
  const busCount = 6 + Math.floor(random() * 4) // 6-9 trips per day

  const rows = Array.from({ length: busCount }, (_, index) => {
    const pool = routePool[Math.floor(random() * routePool.length)]
    const cashPayments = Math.round((1500 + random() * 4000) / 10) * 10
    const digitalPayments = Math.round((1500 + random() * 4500) / 10) * 10
    return {
      busId: `B-${100 + Math.floor(random() * 20)}`,
      route: pool.route,
      serviceType: pool.serviceType,
      cashPayments,
      digitalPayments,
      totalRevenue: cashPayments + digitalPayments,
      passengers: 20 + Math.floor(random() * 25),
    }
  })

  return rows
}

// ---------------------------------------------------------------------------
// Calendar date picker
// ---------------------------------------------------------------------------

function CalendarDatePicker({ selectedDate, onSelect }) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  )

  const formattedDate = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0
  ).getDate()
  const firstWeekday = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth(),
    1
  ).getDay()

  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const changeMonth = (delta) => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1))
  }

  const handleMonthChange = (event) => {
    setViewMonth(new Date(viewMonth.getFullYear(), Number(event.target.value), 1))
  }

  const handleYearChange = (event) => {
    setViewMonth(new Date(Number(event.target.value), viewMonth.getMonth(), 1))
  }

  const pickDay = (day) => {
    const picked = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
    onSelect(picked)
    setOpen(false)
  }

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/30 bg-white/5 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10"
      >
        <Calendar className="h-4 w-4 text-gray-400" />
        {formattedDate}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-white/10 bg-[#0f1729] p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="rounded-md px-2 py-1 text-sm text-gray-400 hover:bg-white/10 hover:text-white"
              >
                ‹
              </button>

              <div className="flex flex-1 items-center justify-center gap-1.5">
                <select
                  value={viewMonth.getMonth()}
                  onChange={handleMonthChange}
                  className="rounded-md border border-white/10 bg-[#1a2438] px-1.5 py-1 text-xs font-semibold text-white outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]"
                >
                  {MONTH_NAMES.map((name, index) => (
                    <option key={name} value={index} className="bg-[#1a2438]">
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={viewMonth.getFullYear()}
                  onChange={handleYearChange}
                  className="rounded-md border border-white/10 bg-[#1a2438] px-1.5 py-1 text-xs font-semibold text-white outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year} className="bg-[#1a2438]">
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="rounded-md px-2 py-1 text-sm text-gray-400 hover:bg-white/10 hover:text-white"
              >
                ›
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-500">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={`${d}-${i}`}>{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) return <span key={`empty-${i}`} />
                const cellDate = new Date(
                  viewMonth.getFullYear(),
                  viewMonth.getMonth(),
                  day
                )
                const isSelected = toDateKey(cellDate) === toDateKey(selectedDate)
                const isToday = toDateKey(cellDate) === toDateKey(new Date())
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => pickDay(day)}
                    className={`aspect-square rounded-md text-xs transition-colors ${
                      isSelected
                        ? 'bg-[#3b82f6] font-semibold text-white'
                        : isToday
                        ? 'border border-[#3b82f6]/50 text-gray-200'
                        : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({ label, value }) {
  return (
    <article className="flex flex-col items-center justify-center rounded-xl bg-[#0f1729] px-6 py-8 shadow-sm border border-white/5">
      <p className="mb-2 text-sm text-gray-400">{label}</p>
      <p className="text-xl font-semibold text-white">{value}</p>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Reports panel — this is the only thing this file needs to export.
// Your App.jsx should render <Sidebar /> once, then render this panel
// as the main content when the "reports" tab is active.
// ---------------------------------------------------------------------------

export default function ReportsPanel() {
  const [selectedDate, setSelectedDate] = useState(new Date())

  const financialRows = useMemo(
    () => generateTripsForDate(toDateKey(selectedDate)),
    [selectedDate]
  )

  const financialStats = useMemo(() => {
    const cashPayments = financialRows.reduce((sum, row) => sum + row.cashPayments, 0)
    const digitalPayments = financialRows.reduce((sum, row) => sum + row.digitalPayments, 0)
    const totalPassengers = financialRows.reduce((sum, row) => sum + row.passengers, 0)
    const totalRevenue = cashPayments + digitalPayments

    const currency = (value) =>
      `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    return [
      { label: 'Cash Payments', value: currency(cashPayments) },
      { label: 'Digital Payments', value: currency(digitalPayments) },
      { label: 'Total Trips Profit', value: currency(totalRevenue) },
      { label: 'Total Passengers', value: `${totalPassengers} Passengers` },
    ]
  }, [financialRows])

  return (
    <>
      <header className="flex items-center justify-between rounded-xl bg-[#0f1729] px-8 py-5 shadow-sm border border-white/5">
        <h1 className="text-2xl font-bold text-white">Financial Auditing</h1>
        <CalendarDatePicker selectedDate={selectedDate} onSelect={setSelectedDate} />
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {financialStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className="rounded-xl bg-[#0f1729] p-6 shadow-sm border border-white/5">
        <h2 className="mb-5 text-lg font-bold text-white">
          Trips Schedule —{' '}
          {selectedDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-white/5">
                <th className="px-4 py-3 text-center font-semibold text-gray-300">Bus ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">Route</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Type Of Service
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Cash Payments
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Digital Payments
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Total Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {financialRows.map((row, index) => (
                <tr
                  key={`${row.busId}-${index}`}
                  className={index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.03]'}
                >
                  <td className="px-4 py-3 text-center text-gray-300">{row.busId}</td>
                  <td className="px-4 py-3 text-left text-gray-300">{row.route}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{row.serviceType}</td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    ₱{row.cashPayments.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    ₱{row.digitalPayments.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    ₱{row.totalRevenue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}