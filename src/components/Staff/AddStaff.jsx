import { useState } from 'react'
import { Check, User, X } from 'lucide-react'

const emptyStaffForm = {
  firstName: '',
  lastName: '',
  middleName: '',
  position: '',
  contactNumber: '',
  email: '',
}

export default function AddStaffModal({ onClose, onAdd, nextStaffId }) {
  const [form, setForm] = useState(emptyStaffForm)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!form.firstName || !form.lastName || !form.position || !form.contactNumber || !form.email) {
      return
    }

    const name = [form.firstName, form.middleName, form.lastName]
      .filter(Boolean)
      .join(' ')

    onAdd({
      staffId: nextStaffId,
      name,
      position: form.position,
      contactNumber: form.contactNumber,
      email: form.email,
      status: 'Active',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-800">Add New Staff</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-600">First Name</span>
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="Juan"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-600">Last Name</span>
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="dela Cruz"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-600">Middle Name</span>
            <input
              type="text"
              name="middleName"
              value={form.middleName}
              onChange={handleChange}
              placeholder="Middle Name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-600">Position</span>
            <select
              name="position"
              value={form.position}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            >
              <option value="">Select Position</option>
              <option value="Driver">Driver</option>
              <option value="Chauffeur">Chauffeur</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-600">
              Contact Number
            </span>
            <input
              type="text"
              name="contactNumber"
              value={form.contactNumber}
              onChange={handleChange}
              placeholder="09XX XXX XXXX"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-600">Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="staff@example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <Check className="h-4 w-4" />
              Save Staff
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}