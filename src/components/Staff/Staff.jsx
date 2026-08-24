import { useState } from 'react'
import { Plus } from 'lucide-react'
import AddStaffModal from './AddStaff'

export default function StaffPanel({ initialStaff }) {
  const [staff, setStaff] = useState(initialStaff)
  const [showAddStaff, setShowAddStaff] = useState(false)

  function getNextStaffId() {
    const maxId = staff.reduce((max, member) => {
      const num = parseInt(member.staffId.replace('S', ''), 10)
      return num > max ? num : max
    }, 200)
    return `S${maxId + 1}`
  }

  function handleAddStaff(member) {
    setStaff((prev) => [...prev, member])
  }

  return (
    <>
      <header className="rounded-xl bg-white px-5 py-4 shadow-sm sm:px-8 sm:py-5">
        <h1 className="text-xl font-bold text-gray-800 sm:text-2xl">
          Staff Management
        </h1>
      </header>

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <h2 className="text-base font-bold text-gray-800 sm:text-lg">Personnel</h2>
          <button
            type="button"
            onClick={() => setShowAddStaff(true)}
            className="inline-flex items-center justify-center gap-1.5 self-start rounded-lg border border-[#00a8cc]/40 bg-white px-4 py-2 text-sm font-medium text-[#00a8cc] transition-colors hover:bg-[#00a8cc]/5 sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Add Staff
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-3 text-center font-semibold text-gray-700 sm:px-4">
                  Staff ID
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700 sm:px-4">
                  Staff Name
                </th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700 sm:px-4">
                  Position
                </th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700 sm:px-4">
                  Contact Number
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700 sm:px-4">
                  Email
                </th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700 sm:px-4">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member, index) => (
                <tr
                  key={member.staffId}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-3 py-3 text-center text-gray-700 sm:px-4">
                    {member.staffId}
                  </td>
                  <td className="px-3 py-3 text-left text-gray-700 sm:px-4">
                    {member.name}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-700 sm:px-4">
                    {member.position}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-700 sm:px-4">
                    {member.contactNumber}
                  </td>
                  <td className="px-3 py-3 text-left text-gray-700 sm:px-4">
                    {member.email}
                  </td>
                  <td className="px-3 py-3 text-center font-medium text-gray-700 sm:px-4">
                    {member.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showAddStaff ? (
        <AddStaffModal
          onClose={() => setShowAddStaff(false)}
          onAdd={handleAddStaff}
          nextStaffId={getNextStaffId()}
        />
      ) : null}
    </>
  )
}