import { OpChip } from './OperatorUI';
import { formatManilaDateTime } from '../../../utils/dates';

const PRIORITY_TONE = { high: 'danger', medium: 'warning', low: 'info' };

/**
 * One piece of reroute advice with the Operator's decision. "Acknowledge advice" and "Keep current route" only RECORD
 * the Operator's decision on the trip (audit logged); they dispatch and reroute nothing.
 */
export default function RerouteAdviceItem({ item, saving, onDecide }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <OpChip tone={PRIORITY_TONE[item.priority]}>{item.priority === 'high' ? 'High priority' : 'Review'}</OpChip>
        <span className="text-sm font-semibold text-slate-900">{item.route}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{item.text}</p>
      {item.decisionLabel ? (
        <p className="mt-2 text-xs font-semibold text-emerald-700">
          Recorded: {item.decisionLabel}{item.decidedAt ? ` (${formatManilaDateTime(item.decidedAt)})` : ''}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving === item.tripId}
            onClick={() => onDecide(item, 'accept')}
            className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-60"
          >
            {saving === item.tripId ? 'Saving...' : 'Acknowledge advice'}
          </button>
          <button
            type="button"
            disabled={saving === item.tripId}
            onClick={() => onDecide(item, 'keep')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Keep current route
          </button>
        </div>
      )}
    </li>
  );
}
