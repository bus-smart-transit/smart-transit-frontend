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
  { id: 'reports', label: 'Reports', icon: PieChart },
  { id: 'staff', label: 'Staff', icon: Users },
]

export default function Sidebar({ activeTab, onTabChange }) {
  return (
    <aside className="flex w-[220px] shrink-0 flex-col bg-[#243b72] px-4 py-8">
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
        )})}
      </nav>

      <button
        type="button"
        className="mt-auto flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Settings className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        Settings
      </button>
    </aside>
  )
}
