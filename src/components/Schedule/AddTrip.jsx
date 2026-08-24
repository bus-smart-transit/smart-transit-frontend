import { useState } from 'react'
import { X } from 'lucide-react'

const emptyTripForm = {
  busId: '',
  route: '',
  driver: '',
  chauffeur: '',
  departureTime: '',
  serviceType: 'Aircon',
}

export default function AddTripModal({ onClose, onAdd, staff }) {
  const [form, setForm] = useState(emptyTripForm)

  const drivers = staff.filter((member) => member.position === 'Driver')
  const chauffeurs = staff.filter((member) => member.position === 'Chauffeur')

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!form.busId || !form.route || !form.driver || !form.chauffeur || !form.departureTime) {
      return
    }

    onAdd({
      ...form,
      status: 'Upcoming',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-5 flex items-center justify-between sm:mb-6">
          <h2 className="text-lg font-bold text-gray-800 sm:text-xl">Add Trip</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-600">Bus ID</span>
              <input
                type="text"
                name="busId"
                value={form.busId}
                onChange={handleChange}
                placeholder="e.g. B-107"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-600">
                Departure Time
              </span>
              <input
                type="text"
                name="departureTime"
                value={form.departureTime}
                onChange={handleChange}
                placeholder="e.g. 5:00 AM"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-600">Route</span>
            <input
              type="text"
              name="route"
              value={form.route}
              onChange={handleChange}
              placeholder="e.g. Davao City - Cateel"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-600">Driver</span>
              <select
                name="driver"
                value={form.driver}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
              >
                <option value="">Select Driver</option>
                {drivers.map((member) => (
                  <option key={member.staffId} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-600">Chauffeur</span>
              <select
                name="chauffeur"
                value={form.chauffeur}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
              >
                <option value="">Select Chauffeur</option>
                {chauffeurs.map((member) => (
                  <option key={member.staffId} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-600">
              Type Of Service
            </span>
            <select
              name="serviceType"
              value={form.serviceType}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            >
              <option value="Aircon">Aircon</option>
              <option value="Non-Aircon">Non-Aircon</option>
            </select>
          </label>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#00a8cc] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0096b8]"
            >
              Add Trip
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}