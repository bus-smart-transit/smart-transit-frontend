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
      <header className="rounded-xl bg-[#0f1729] px-8 py-5 shadow-sm border border-white/5">
        <h1 className="text-2xl font-bold text-white">Staff Management</h1>
      </header>

      <section className="rounded-xl bg-[#0f1729] p-6 shadow-sm border border-white/5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Personnel</h2>
          <button
            type="button"
            onClick={() => setShowAddStaff(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#00a8cc]/40 bg-transparent px-4 py-2 text-sm font-medium text-[#00a8cc] transition-colors hover:bg-[#00a8cc]/10"
          >
            <Plus className="h-4 w-4" />
            Add Staff
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#1a2438]">
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Staff ID
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">
                  Staff Name
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Position
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Contact Number
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">
                  Email
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member, index) => (
                <tr
                  key={member.staffId}
                  className={`border-b border-white/5 ${
                    index % 2 === 0 ? 'bg-[#0f1729]' : 'bg-[#141d33]'
                  }`}
                >
                  <td className="px-4 py-3 text-center text-gray-300">
                    {member.staffId}
                  </td>
                  <td className="px-4 py-3 text-left text-gray-300">{member.name}</td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {member.position}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {member.contactNumber}
                  </td>
                  <td className="px-4 py-3 text-left text-gray-300">{member.email}</td>
                  <td className="px-4 py-3 text-center font-medium">
                    <span
                      className={
                        member.status === 'Active'
                          ? 'text-[#00a8cc] font-semibold'
                          : 'text-gray-400 font-semibold'
                      }
                    >
                      {member.status}
                    </span>
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