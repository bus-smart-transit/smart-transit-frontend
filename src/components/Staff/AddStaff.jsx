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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0f1729] border border-white/10 p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-300" />
            <h2 className="text-xl font-bold text-white">Add New Staff</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-400">First Name</span>
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="Juan"
              className="w-full rounded-lg border border-white/10 bg-[#1a2438] px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-400">Last Name</span>
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="dela Cruz"
              className="w-full rounded-lg border border-white/10 bg-[#1a2438] px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-400">Middle Name</span>
            <input
              type="text"
              name="middleName"
              value={form.middleName}
              onChange={handleChange}
              placeholder="Middle Name"
              className="w-full rounded-lg border border-white/10 bg-[#1a2438] px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-400">Position</span>
            <select
              name="position"
              value={form.position}
              onChange={handleChange}
              className="w-full rounded-lg border border-white/10 bg-[#1a2438] px-3 py-2.5 text-sm text-gray-100 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            >
              <option value="" className="bg-[#1a2438]">Select Position</option>
              <option value="Driver" className="bg-[#1a2438]">Driver</option>
              <option value="Chauffeur" className="bg-[#1a2438]">Chauffeur</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-400">
              Contact Number
            </span>
            <input
              type="text"
              name="contactNumber"
              value={form.contactNumber}
              onChange={handleChange}
              placeholder="09XX XXX XXXX"
              className="w-full rounded-lg border border-white/10 bg-[#1a2438] px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-400">Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="staff@example.com"
              className="w-full rounded-lg border border-white/10 bg-[#1a2438] px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
            />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-5 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#00a8cc]/40 bg-transparent px-5 py-2 text-sm font-medium text-[#00a8cc] transition-colors hover:bg-[#00a8cc]/10"
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