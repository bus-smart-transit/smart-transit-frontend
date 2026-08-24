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
    <div className="flex min-h-screen">
      <aside className="flex w-1/2 flex-col items-center justify-center bg-[#243b72] px-12 text-center text-white">
        <h1 className="mb-2 text-5xl font-bold">Bus Operator</h1>
        <p className="mb-16 text-sm tracking-wide text-white/90">
          FLEET MANAGEMENT: Bus Operator PORTAL
        </p>
        <Bus className="h-40 w-40 text-white/90" strokeWidth={1.25} />
      </aside>

      <main className="flex w-1/2 items-center justify-center bg-[#f4f4f4] px-16">
        <div className="w-full max-w-md">
          <h2 className="mb-2 text-4xl font-bold text-gray-900">Sign In</h2>
          <p className="mb-10 text-sm text-gray-600">
            Please enter the credentials provided by your Bus Operator administrator.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
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
