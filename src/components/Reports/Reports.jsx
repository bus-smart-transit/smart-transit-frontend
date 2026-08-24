import { ChevronDown } from 'lucide-react'

function StatCard({ label, value }) {
  return (
    <article className="flex flex-col items-center justify-center rounded-xl bg-white px-4 py-6 shadow-sm sm:px-6 sm:py-8">
      <p className="mb-2 text-xs text-gray-500 sm:text-sm">{label}</p>
      <p className="text-lg font-semibold text-gray-800 sm:text-xl">{value}</p>
    </article>
  )
}

export default function ReportsPanel({ financialStats, financialRows }) {
  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <>
      <header className="flex flex-col gap-3 rounded-xl bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-5">
        <h1 className="text-xl font-bold text-gray-800 sm:text-2xl">
          Financial Auditing
        </h1>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-[#00a8cc]/30 bg-white px-4 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 sm:self-auto sm:text-sm"
        >
          {formattedDate}
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {financialStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-base font-bold text-gray-800 sm:mb-5 sm:text-lg">
          Schedule
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-3 text-center font-semibold text-gray-700 sm:px-4">
                  Bus ID
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700 sm:px-4">
                  Route
                </th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700 sm:px-4">
                  Type Of Service
                </th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700 sm:px-4">
                  Cash Payments
                </th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700 sm:px-4">
                  Digital Payments
                </th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700 sm:px-4">
                  Total Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {financialRows.map((row, index) => (
                <tr
                  key={`${row.busId}-${index}`}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-3 py-3 text-center text-gray-700 sm:px-4">
                    {row.busId}
                  </td>
                  <td className="px-3 py-3 text-left text-gray-700 sm:px-4">
                    {row.route}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-700 sm:px-4">
                    {row.serviceType}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-700 sm:px-4">
                    {row.cashPayments}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-700 sm:px-4">
                    {row.digitalPayments}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-700 sm:px-4">
                    {row.totalRevenue}
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