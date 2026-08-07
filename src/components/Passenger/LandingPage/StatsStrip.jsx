import { Bus, Clock3, TrendingUp, Ticket } from 'lucide-react';

const STATS = [
  { icon: Bus,       value: '13 / 15', label: 'Active Buses' },
  { icon: Ticket,    value: '465',     label: 'Passengers Today' },
  { icon: Clock3,    value: '11',      label: 'Trips in Progress' },
  { icon: TrendingUp, value: '98%',   label: 'On-Time Rate' },
];

export default function StatsStrip() {
  return (
    <section
      aria-label="Live service status"
      className="border-y border-slate-800 bg-slate-900/40 px-4 py-4 sm:px-6 lg:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span
                className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-sky-400"
                aria-hidden="true"
              >
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="font-data text-sm font-semibold text-slate-100">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
