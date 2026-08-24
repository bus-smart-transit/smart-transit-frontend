import { useState } from 'react'
import { Bus } from 'lucide-react'

export default function Login({ onSignIn }) {
  const [operatorId, setOperatorId] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!operatorId || !password) return
    onSignIn()
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex flex-col items-center justify-center bg-[#243b72] px-6 py-10 text-center text-white md:w-1/2 md:px-12 md:py-0">
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl md:text-5xl">Bus Operator</h1>
        <p className="mb-6 text-xs tracking-wide text-white/90 sm:text-sm md:mb-16">
          FLEET MANAGEMENT: Bus Operator PORTAL
        </p>
        <Bus className="h-20 w-20 text-white/90 sm:h-28 sm:w-28 md:h-40 md:w-40" strokeWidth={1.25} />
      </aside>

      <main className="flex flex-1 items-center justify-center bg-[#f4f4f4] px-6 py-10 sm:px-10 md:w-1/2 md:px-16 md:py-0">
        <div className="w-full max-w-md">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">Sign In</h2>
          <p className="mb-8 text-sm text-gray-600 md:mb-10">
            Please enter the credentials provided by your Bus Operator administrator.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-800">
                Bus Operator ID
              </span>
              <input
                type="text"
                value={operatorId}
                onChange={(event) => setOperatorId(event.target.value)}
                placeholder="e.g. BO-2026-001"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-800">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#00a8cc] focus:ring-1 focus:ring-[#00a8cc]"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-lg bg-[#00a8cc] py-3.5 text-sm font-bold tracking-wide text-white transition-colors hover:bg-[#0096b8]"
            >
              SIGN IN
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            Forgot you operator-issued credentials?
          </p>
          <p className="text-center">
            <button
              type="button"
              className="text-sm font-medium text-[#1e88e5] underline hover:text-[#1565c0]"
            >
              Contact Dispatcher
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}