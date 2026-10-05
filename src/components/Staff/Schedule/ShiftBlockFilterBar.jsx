import { RotateCcw } from 'lucide-react';
import Card from '../../ui/Card';
import { EMPTY_FILTERS, STATUS_OPTIONS, isFiltering } from '../../../utils/shiftBlockView';

const FIELD = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500';

/**
 * Batch 30: the named filters of the Shift Blocks view (status, route, driver or chauffeur, date range). The route and
 * person choices come from the cards that were loaded, never from a fixed list.
 */
export default function ShiftBlockFilterBar({ filters, onChange, options }) {
  const set = (patch) => onChange({ ...filters, ...patch });

  return (
    <Card as="section" aria-label="Filters" padding="sm" className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <label className="text-xs font-medium text-slate-600">Status
          <select value={filters.status} onChange={(e) => set({ status: e.target.value })} className={FIELD}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">Route
          <select value={filters.route} onChange={(e) => set({ route: e.target.value })} className={FIELD}>
            <option value="">All routes</option>
            {options.routes.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">Driver or Chauffeur
          <select value={filters.person} onChange={(e) => set({ person: e.target.value })} className={FIELD}>
            <option value="">Everyone</option>
            {options.people.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">From
          <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value })} className={FIELD} />
        </label>
        <label className="text-xs font-medium text-slate-600">To
          <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} className={FIELD} />
        </label>
      </div>
      {isFiltering(filters) && (
        <button type="button" onClick={() => onChange({ ...EMPTY_FILTERS })} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900">
          <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset filters
        </button>
      )}
    </Card>
  );
}
