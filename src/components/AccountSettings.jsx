import { useState } from 'react'
import { LogOut, ShieldCheck, User } from 'lucide-react'


export default function AccountSettings({ user, onLogout }) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const displayName = user?.name ?? 'Admin User'
  const displayEmail = user?.email ?? 'admin@example.com'

  function handleConfirmLogout() {
    setConfirmOpen(false)
    onLogout?.()
  }

  return (
    <>
      <header className="rounded-xl bg-[#0f1729] px-8 py-5 shadow-sm border border-white/5">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </header>

      <section className="rounded-xl bg-[#0f1729] p-6 shadow-sm border border-white/5">
        <h2 className="mb-5 text-lg font-bold text-white">Account</h2>

        <div className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.03] p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#3b82f6]/15">
            <User className="h-6 w-6 text-[#3b82f6]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{displayName}</p>
            <p className="text-sm text-gray-400">{displayEmail}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-[#0f1729] p-6 shadow-sm border border-white/5">
        <h2 className="mb-5 text-lg font-bold text-white">Security</h2>

        <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-white">Session</p>
              <p className="text-sm text-gray-400">
                You're currently signed in on this device.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-transparent px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      </section>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f1729] p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-white">Log out?</h3>
            <p className="mb-6 text-sm text-gray-400">
              You'll need to sign in again to access the dashboard.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}