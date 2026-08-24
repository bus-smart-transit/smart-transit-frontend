import {
  Bus,
  LayoutDashboard,
  MapPin,
  Clock,
  PieChart,
  Users,
  Settings,
} from 'lucide-react'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'fleets', label: 'Fleets', icon: Bus },
  { id: 'routes', label: 'Routes', icon: MapPin },
  { id: 'schedule', label: 'Schedule', icon: Clock },
  { id: 'reports', label: 'Financial Reports', icon: PieChart },
  { id: 'staff', label: 'Staff', icon: Users },
]

export default function Sidebar({ activeTab, onTabChange }) {
  return (
    <>
      {/* ================================================================
          DESKTOP SIDEBAR
      ================================================================ */}

      <aside className="hidden w-[220px] shrink-0 flex-col bg-[#243b72] px-4 py-8 md:flex">
        <div className="mb-10 flex justify-center">
          <Bus className="h-14 w-14 text-white" strokeWidth={1.5} />
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={`relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#1a2d5a] text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {active && (
                  <span className="absolute -left-4 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r bg-[#00a8cc]" />
                )}
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                {label}
              </button>
            )
          })}
        </nav>

        <button
          type="button"
          className="mt-auto flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Settings className="h-5 w-5 shrink-0" strokeWidth={1.75} />
          Settings
        </button>
      </aside>

      {/* ================================================================
          MOBILE TOP BAR (LOGO)
      ================================================================ */}

      <header className="flex items-center justify-center bg-[#243b72] px-4 py-3 md:hidden">
        <Bus className="h-8 w-8 text-white" strokeWidth={1.5} />
      </header>

      {/* ================================================================
          MOBILE BOTTOM NAV
      ================================================================ */}

      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch overflow-x-auto bg-[#243b72] pb-[env(safe-area-inset-bottom)] md:hidden">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`relative flex min-w-[64px] flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[0.65rem] font-medium transition-colors ${
                active ? 'text-white' : 'text-white/70'
              }`}
            >
              {active && (
                <span className="absolute inset-x-3 top-0 h-0.5 rounded-b bg-[#00a8cc]" />
              )}
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
              <span className="leading-tight">{label}</span>
            </button>
          )
        })}

        <button
          type="button"
          className="flex min-w-[64px] flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[0.65rem] font-medium text-white/70"
        >
          <Settings className="h-5 w-5 shrink-0" strokeWidth={1.75} />
          <span className="leading-tight">Settings</span>
        </button>
      </nav>
    </>
  )
}