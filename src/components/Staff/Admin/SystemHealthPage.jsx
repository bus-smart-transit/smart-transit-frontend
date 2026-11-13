import { RefreshCw } from 'lucide-react';
import { OpPageHeader, OpCard, OpChip } from '../Operator/OperatorUI';
import { OP_SPACE } from '../Operator/operatorUiTokens';
import { formatManilaDateTime } from '../../../utils/dates';

import { SkeletonStats } from '../../ui/Skeleton';
const STATUS = {
  ok: { tone: 'success', label: 'Working' },
  problem: { tone: 'danger', label: 'Problem' },
  unknown: { tone: 'neutral', label: 'No record yet' },
};

function HealthList({ items }) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => {
        const status = STATUS[item.status] ?? STATUS.unknown;
        return (
          <li key={item.key} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
              <span className="block text-xs text-slate-500">{item.note}{item.at ? ` Last: ${formatManilaDateTime(item.at)}` : ''}</span>
            </span>
            <OpChip tone={status.tone} className="self-start sm:self-center">{status.label}</OpChip>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Batch 48 Phase 6: the Super Admin's System health page. Read only and without secrets: whether the database,
 * scheduled tasks and background jobs are working, and the last result of email, phone notifications and each outside
 * service. "No record yet" means nothing has been recorded, not that it works.
 */
export default function SystemHealthPage({ healthTab }) {
  const { health, loading, error, reload } = healthTab;

  return (
    <div className={OP_SPACE.stack}>
      <OpPageHeader
        title="System health"
        subtitle="Is everything running? Read only."
        action={<button type="button" onClick={reload} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50"><RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh</button>}
      />
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {loading && !health && <SkeletonStats label="Loading..." />}
      {health && (
        <>
          <OpCard title="SmartTransit"><HealthList items={health.core ?? []} /></OpCard>
          <OpCard title="Outside services" subtitle="The last call to each one."><HealthList items={health.services ?? []} /></OpCard>
        </>
      )}
    </div>
  );
}
