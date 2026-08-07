import { Link } from 'react-router-dom';
import { Bus, Users, Wallet } from 'lucide-react';

const ROLES = [
  { icon: Users,  label: 'Operator',  note: 'Desktop' },
  { icon: Bus,    label: 'Driver',    note: 'Tablet'  },
  { icon: Wallet, label: 'Conductor', note: 'Mobile'  },
];

export default function OperationsAccessCard() {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-300">Operations Access</h3>
          <p className="mt-1 text-sm text-slate-500">
            For operator, driver, and conductor portal access.
          </p>
        </div>
        <span className="flex-shrink-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Staff
        </span>
      </div>

      {/* Role rows */}
      <ul className="mt-4 space-y-2" aria-label="Staff roles">
        {ROLES.map(({ icon: Icon, label, note }) => (
          <li
            key={label}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm"
          >
            <span className="inline-flex items-center gap-2 text-slate-300">
              <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
              {label}
            </span>
            <span className="text-xs text-slate-600">{note}</span>
          </li>
        ))}
      </ul>

      <Link
        to="/employee/login"
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-950 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
      >
        Open Staff Login
      </Link>
    </article>
  );
}
