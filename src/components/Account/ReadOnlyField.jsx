import { Lock } from 'lucide-react';
import { NOT_PROVIDED } from '../../utils/accountProfile';

/**
 * One detail the person cannot change here. It looks locked (grey box, lock icon) and says so to screen readers.
 * A missing value reads "Not provided", never a dash, zero or made-up value.
 */
export default function ReadOnlyField({ label, value, mono = false, testId, emptyText = NOT_PROVIDED }) {
  const missing = value === undefined || value === null || value === '';
  return (
    <div data-testid={testId}>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        <Lock size={14} aria-hidden="true" className="shrink-0 text-slate-400" />
        <span className={`min-w-0 break-words ${missing ? 'italic text-slate-400' : `text-slate-900 ${mono ? 'font-data' : ''}`}`}>
          {missing ? emptyText : value}
        </span>
        <span className="sr-only"> (read only)</span>
      </dd>
    </div>
  );
}
