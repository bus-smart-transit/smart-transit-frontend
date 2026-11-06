import { RefreshCw } from 'lucide-react';
import { OpPageHeader, OpCard, OpStat, OpChip } from '../Operator/OperatorUI';
import { OP_SPACE } from '../Operator/operatorUiTokens';

const COUNTS = [
  ['companies', 'Companies'],
  ['operators', 'Operators', 'accounts that are on'],
  ['buses', 'Buses'],
  ['routes', 'Routes'],
  ['trips_today', 'Trips today'],
  ['tickets_paid_today', 'Tickets paid today', 'online and cash'],
];

/**
 * Batch 48 Phase 2: the Super Admin Dashboard. Platform counts across every company and a short "needs attention"
 * list. Read only. Kept small on purpose (user: only the UI that is needed).
 */
export default function SuperAdminDashboard({ overview, loading, error, onReload }) {
  return (
    <div className={OP_SPACE.stack}>
      <OpPageHeader
        title="Dashboard"
        subtitle="Every company on SmartTransit, today"
        action={<button type="button" onClick={onReload} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50"><RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh</button>}
      />

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {loading && !overview && <p role="status" className="text-sm text-slate-500">Loading...</p>}

      {overview && (
        <>
          <section aria-label="Platform counts" className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {COUNTS.map(([key, label, hint]) => <OpStat key={key} label={label} value={overview.counts?.[key] ?? 'Not provided'} hint={hint} />)}
          </section>

          <OpCard title="Needs attention">
            <ul className="divide-y divide-slate-100">
              {(overview.attention ?? []).map((item) => (
                <li key={item.key} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="text-slate-700">{item.label}</span>
                  <OpChip tone={item.count > 0 ? 'warning' : 'success'}>{item.count}</OpChip>
                </li>
              ))}
            </ul>
          </OpCard>
        </>
      )}
    </div>
  );
}
