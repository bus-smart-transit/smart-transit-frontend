import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

const emptyTripForm = {
  busId: '',
  departure: '',
  destination: '',
  driver: '',
  chauffeur: '',
  departureDate: '',
  departureHour: '',
  departureMinute: '',
  departurePeriod: '',
  serviceType: 'Aircon',
}

export default function AddTripModal({ onClose, onAdd, staff }) {
  const [form, setForm] = useState(emptyTripForm)
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false)

  const drivers = staff.filter(
    (member) => member.position === 'Driver'
  )

  const chauffeurs = staff.filter(
    (member) => member.position === 'Chauffeur'
  )

  function handleChange(event) {
    const { name, value } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (
      !form.busId ||
      !form.departure ||
      !form.destination ||
      !form.driver ||
      !form.chauffeur ||
      !form.departureDate ||
      !form.departureHour ||
      !form.departureMinute ||
      !form.departurePeriod
    ) {
      return
    }

    onAdd({
      busId: form.busId,
      departure: form.departure,
      destination: form.destination,
      route: `${form.departure} - ${form.destination}`,
      driver: form.driver,
      chauffeur: form.chauffeur,
      departureDate: form.departureDate,
      departureTime: `${form.departureHour}:${form.departureMinute} ${form.departurePeriod}`,
      serviceType: form.serviceType,
      status: 'Upcoming',
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#131a2e] p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-100">
            Schedule Trip
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-400">
                Bus ID
              </span>

              <input
                type="text"
                name="busId"
                value={form.busId}
                onChange={handleChange}
                placeholder="e.g. B-107"
                className="w-full rounded-lg border border-gray-700 bg-[#0d1220] px-3 py-2 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-[#4d8eff] focus:ring-1 focus:ring-[#4d8eff]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-400">
                Departure Date
              </span>
              <input
                type="date"
                name="departureDate"
                value={form.departureDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-700 bg-[#0d1220] px-3 py-2 text-sm text-gray-100 outline-none focus:border-[#4d8eff] focus:ring-1 focus:ring-[#4d8eff]"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-400">
              Departure Time
            </span>
            <div className="relative">
              <button
                type="button"
                aria-label="Departure time"
                aria-expanded={isTimeDropdownOpen}
                onClick={() => setIsTimeDropdownOpen((open) => !open)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-700 bg-[#0d1220] px-3 py-2 text-left text-sm text-gray-100 outline-none focus:border-[#4d8eff] focus:ring-1 focus:ring-[#4d8eff]"
              >
                <span className={form.departureHour ? 'text-gray-100' : 'text-gray-500'}>
                  {form.departureHour && form.departureMinute && form.departurePeriod
                    ? `${form.departureHour}:${form.departureMinute} ${form.departurePeriod}`
                    : 'Select departure time'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {isTimeDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 grid grid-cols-3 gap-2 rounded-lg border border-gray-700 bg-[#131a2e] p-3 shadow-xl">
                  <label className="text-xs font-medium text-gray-400">
                    Hour
                    <select
                      aria-label="Departure hour"
                      name="departureHour"
                      value={form.departureHour}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-md border border-gray-700 bg-[#0d1220] px-2 py-2 text-sm text-gray-100 outline-none focus:border-[#4d8eff]"
                    >
                      <option value="">Hour</option>
                      {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((hour) => (
                        <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-gray-400">
                    Minute
                    <select
                      aria-label="Departure minute"
                      name="departureMinute"
                      value={form.departureMinute}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-md border border-gray-700 bg-[#0d1220] px-2 py-2 text-sm text-gray-100 outline-none focus:border-[#4d8eff]"
                    >
                      <option value="">Minute</option>
                      {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0')).map((minute) => (
                        <option key={minute} value={minute}>{minute}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-gray-400">
                    AM/PM
                    <select
                      aria-label="Departure AM or PM"
                      name="departurePeriod"
                      value={form.departurePeriod}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-md border border-gray-700 bg-[#0d1220] px-2 py-2 text-sm text-gray-100 outline-none focus:border-[#4d8eff]"
                    >
                      <option value="">Select</option>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsTimeDropdownOpen(false)}
                    className="col-span-3 rounded-md bg-[#4d8eff] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3b7de0]"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-400">
                Departure
              </span>

              <input
                type="text"
                name="departure"
                value={form.departure}
                onChange={handleChange}
                placeholder="e.g. Davao City"
                className="w-full rounded-lg border border-gray-700 bg-[#0d1220] px-3 py-2 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-[#4d8eff] focus:ring-1 focus:ring-[#4d8eff]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-400">
                Destination
              </span>

              <input
                type="text"
                name="destination"
                value={form.destination}
                onChange={handleChange}
                placeholder="e.g. Cateel"
                className="w-full rounded-lg border border-gray-700 bg-[#0d1220] px-3 py-2 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-[#4d8eff] focus:ring-1 focus:ring-[#4d8eff]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-400">
                Driver
              </span>

              <select
                name="driver"
                value={form.driver}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-700 bg-[#0d1220] px-3 py-2 text-sm text-gray-100 outline-none focus:border-[#4d8eff] focus:ring-1 focus:ring-[#4d8eff]"
              >
                <option value="">
                  Select Driver
                </option>

                {drivers.map((member) => (
                  <option
                    key={member.staffId}
                    value={member.name}
                  >
                    {member.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-400">
                Chauffeur
              </span>

              <select
                name="chauffeur"
                value={form.chauffeur}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-700 bg-[#0d1220] px-3 py-2 text-sm text-gray-100 outline-none focus:border-[#4d8eff] focus:ring-1 focus:ring-[#4d8eff]"
              >
                <option value="">
                  Select Chauffeur
                </option>

                {chauffeurs.map((member) => (
                  <option
                    key={member.staffId}
                    value={member.name}
                  >
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-400">
              Type Of Service
            </span>

            <select
              name="serviceType"
              value={form.serviceType}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-700 bg-[#0d1220] px-3 py-2 text-sm text-gray-100 outline-none focus:border-[#4d8eff] focus:ring-1 focus:ring-[#4d8eff]"
            >
              <option value="Aircon">
                Aircon
              </option>

              <option value="Non-Aircon">
                Non-Aircon
              </option>
            </select>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-700 px-5 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-[#4d8eff] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3b7de0]"
            >
              Schedule Trip
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}