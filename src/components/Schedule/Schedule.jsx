import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import AddTripModal from './AddTrip'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateFromKey(dateKey) {
  if (!dateKey) return new Date()
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function ScheduleDateFilter({ dateFilter, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedDate = dateFromKey(dateFilter)
  const [viewMonth, setViewMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  )
  const formattedDate = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0,
  ).getDate()
  const firstWeekday = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth(),
    1,
  ).getDay()
  const calendarDays = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  const yearOptions = Array.from(
    { length: 21 },
    (_, index) => new Date().getFullYear() - 10 + index,
  )

  function selectDay(day) {
    onChange(toDateKey(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)))
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Filter schedule by date"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/30 bg-white/5 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10"
      >
        <Calendar className="h-4 w-4 text-gray-400" />
        {formattedDate}
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close calendar"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-white/10 bg-[#0f1729] p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setViewMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                className="rounded-md px-2 py-1 text-sm text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex flex-1 items-center justify-center gap-1.5">
                <select
                  aria-label="Calendar month"
                  value={viewMonth.getMonth()}
                  onChange={(event) => setViewMonth((month) => new Date(month.getFullYear(), Number(event.target.value), 1))}
                  className="rounded-md border border-white/10 bg-[#1a2438] px-1.5 py-1 text-xs font-semibold text-white outline-none focus:border-[#3b82f6]"
                >
                  {MONTH_NAMES.map((month, index) => (
                    <option key={month} value={index}>{month}</option>
                  ))}
                </select>
                <select
                  aria-label="Calendar year"
                  value={viewMonth.getFullYear()}
                  onChange={(event) => setViewMonth((month) => new Date(Number(event.target.value), month.getMonth(), 1))}
                  className="rounded-md border border-white/10 bg-[#1a2438] px-1.5 py-1 text-xs font-semibold text-white outline-none focus:border-[#3b82f6]"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setViewMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                className="rounded-md px-2 py-1 text-sm text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-500">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <span key={`${day}-${index}`}>{day}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (day === null) return <span key={`empty-${index}`} />
                const cellDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
                const isSelected = dateFilter && toDateKey(cellDate) === dateFilter
                const isToday = toDateKey(cellDate) === toDateKey(new Date())
                return (
                  <button
                    key={day}
                    type="button"
                    aria-label={cellDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    onClick={() => selectDay(day)}
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
            {dateFilter && (
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setIsOpen(false)
                }}
                className="mt-3 w-full rounded-md py-1.5 text-xs text-gray-400 hover:bg-white/10 hover:text-white"
              >
                Clear date filter
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, highlight = false }) {
  return (
    <article className="flex flex-col items-center justify-center rounded-xl bg-[#131a2e] px-6 py-8 shadow-sm">
      <p className="mb-2 text-sm text-gray-400">{label}</p>
      <p
        className={`text-xl font-semibold ${
          highlight ? 'text-[#4d8eff]' : 'text-gray-100'
        }`}
      >
        {value}
      </p>
    </article>
  )
}

function AssignmentModal({ trip, role, staff, onClose, onAssign }) {
  const [selectedName, setSelectedName] = useState('')
  const roleTitle = role === 'driver' ? 'Driver' : 'Chauffeur'
  const availableStaff = staff.filter(
    (member) => member.position === roleTitle && member.status === 'Active',
  )

  function handleSubmit(event) {
    event.preventDefault()
    if (!selectedName) return
    onAssign(selectedName)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#131a2e] p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-100">Assign {roleTitle}</h2>
            <p className="mt-1 text-sm text-gray-400">{trip.busId} · {trip.route}</p>
          </div>
          <button
            type="button"
            aria-label="Close assignment dialog"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-400">Select {roleTitle}</span>
            <select
              aria-label={`Select ${roleTitle}`}
              value={selectedName}
              onChange={(event) => setSelectedName(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-[#0d1220] px-3 py-2 text-sm text-gray-100 outline-none focus:border-[#4d8eff] focus:ring-1 focus:ring-[#4d8eff]"
            >
              <option value="">Choose an available {roleTitle.toLowerCase()}</option>
              {availableStaff.map((member) => (
                <option key={member.staffId} value={member.name}>{member.name}</option>
              ))}
            </select>
          </label>

          {availableStaff.length === 0 && (
            <p className="mt-2 text-sm text-amber-300">No active {roleTitle.toLowerCase()} is available.</p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedName}
              className="rounded-lg bg-[#4d8eff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3b7de0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SchedulePanel({ scheduleStats, initialTrips, staff }) {
  const [trips, setTrips] = useState(initialTrips)
  const [showAddTrip, setShowAddTrip] = useState(false)
  const [dateFilter, setDateFilter] = useState('')
  const [assignmentRequest, setAssignmentRequest] = useState(null)

  function handleAddTrip(trip) {
    setTrips((prev) => [...prev, trip])
  }

  function handleAssignStaff(name) {
    setTrips((prev) => prev.map((trip) => (
      trip === assignmentRequest.trip
        ? { ...trip, [assignmentRequest.role]: name }
        : trip
    )))
    setAssignmentRequest(null)
  }

  const filteredTrips = trips.filter(
    (trip) => !dateFilter || trip.departureDate === dateFilter,
  )

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#131a2e] px-8 py-5 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-100">Trip Schedule</h1>
        <ScheduleDateFilter dateFilter={dateFilter} onChange={setDateFilter} />
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {scheduleStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className="rounded-xl bg-[#131a2e] p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-100">Schedule</h2>
          <button
            type="button"
            onClick={() => setShowAddTrip(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#4d8eff]/40 bg-transparent px-4 py-2 text-sm font-medium text-[#4d8eff] transition-colors hover:bg-[#4d8eff]/10"
          >
            <Plus className="h-4 w-4" />
            Schedule Trip
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#0d1220]">
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Bus ID
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">
                  Route
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">
                  Driver
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">
                  Chauffeur
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
              {filteredTrips.map((trip, index) => (
                <tr
                  key={`${trip.busId}-${index}`}
                  className={index % 2 === 0 ? 'bg-[#131a2e]' : 'bg-[#0f1526]'}
                >
                  <td className="px-4 py-3 text-center text-gray-300">{trip.busId}</td>
                  <td className="px-4 py-3 text-left text-gray-300">{trip.route}</td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {trip.departureDate || '—'}
                  </td>
                  <td className="px-4 py-3 text-left text-gray-300">
                    {trip.driver || (
                      <button
                        type="button"
                        aria-label={`Assign driver for ${trip.busId}`}
                        onClick={() => setAssignmentRequest({ trip, role: 'driver' })}
                        className="rounded-md border border-[#4d8eff]/40 px-3 py-1 text-xs font-semibold text-[#75a8ff] transition-colors hover:bg-[#4d8eff]/10"
                      >
                        Assign
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-left text-gray-300">
                    {trip.chauffeur || (
                      <button
                        type="button"
                        aria-label={`Assign chauffeur for ${trip.busId}`}
                        onClick={() => setAssignmentRequest({ trip, role: 'chauffeur' })}
                        className="rounded-md border border-[#4d8eff]/40 px-3 py-1 text-xs font-semibold text-[#75a8ff] transition-colors hover:bg-[#4d8eff]/10"
                      >
                        Assign
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {trip.departureTime}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {trip.serviceType}
                  </td>
                  <td className={`px-4 py-3 text-center font-medium ${
                    trip.status === 'Ongoing' ? 'text-[#4d8eff]' : 'text-gray-300'
                  }`}>
                    {trip.status}
                  </td>
                </tr>
              ))}
              {filteredTrips.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                    No trips scheduled for this date.
                  </td>
                </tr>
              )}
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
      {assignmentRequest ? (
        <AssignmentModal
          trip={assignmentRequest.trip}
          role={assignmentRequest.role}
          staff={staff}
          onClose={() => setAssignmentRequest(null)}
          onAssign={handleAssignStaff}
        />
      ) : null}
    </>
  )
}