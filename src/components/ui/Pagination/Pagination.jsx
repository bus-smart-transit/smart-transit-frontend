import { ChevronLeft, ChevronRight } from 'lucide-react';
import { pageSummary } from '../../../utils/pagination';

/**
 * Batch 46 (shared; Batch 48 reuses it): the footer of a paged list. Previous / Next buttons with 44 px touch
 * targets, and the current page for screen readers.
 */
export default function Pagination({ page, perPage, total, lastPage, onPageChange, label = 'Pages' }) {
  const last = Math.max(1, lastPage || Math.ceil((total || 0) / (perPage || 1)));
  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
      <p aria-live="polite">{pageSummary({ page, perPage, total })}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 px-3 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
        </button>
        <span className="px-1 text-xs text-slate-500" aria-current="page">Page {page} of {last}</span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= last}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 px-3 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
