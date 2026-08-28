import {
  Bus,
  LayoutDashboard,
  MapPin,
  Clock,
  PieChart,
  Users,
  Settings,
} from 'lucide-react'

export const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'fleets', label: 'Fleets', icon: Bus },
  { id: 'routes', label: 'Routes', icon: MapPin },
  { id: 'schedule', label: 'Schedule', icon: Clock },
  { id: 'reports', label: 'Financial Reports', icon: PieChart },
  { id: 'staff', label: 'Staff', icon: Users },
]

export default function Sidebar({ activeTab, onTabChange }) {
  const settingsActive = activeTab === 'settings'

  return (
    <aside className="flex w-[220px] shrink-0 flex-col bg-[#0a0e1a] px-4 py-8 border-r border-white/5">
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
                  ? 'bg-white/10 text-white'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              {active && (
                <span className="absolute -left-4 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r bg-[#3b82f6]" />
              )}
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
              {label}
            </button>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={() => onTabChange('settings')}
        className={`relative mt-auto flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
          settingsActive
            ? 'bg-white/10 text-white'
            : 'text-white/70 hover:bg-white/5 hover:text-white'
        }`}
      >
        {settingsActive && (
          <span className="absolute -left-4 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r bg-[#3b82f6]" />
        )}
        <Settings className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        Settings
      </button>
    </aside>
  )
}