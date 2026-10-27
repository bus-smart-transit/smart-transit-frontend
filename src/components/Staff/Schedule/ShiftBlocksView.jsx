import { useMemo, useState } from 'react';
import Card from '../../ui/Card';
import FilterTabs from '../../ui/FilterTabs';
import { useShiftBlocksTab } from '../../../api/hooks/Staff/useOperatorDashboard';
import { getBusinessToday } from '../../../utils/dates';
import {
  EMPTY_FILTERS, SECTIONS, VIEWS, applyFilters, filterOptions, groupBySection, isFiltering, showsAssignmentState,
} from '../../../utils/shiftBlockView';
import ShiftBlockCard from './ShiftBlockCard';
import ShiftBlockFilterBar from './ShiftBlockFilterBar';
import LegTimeEditor from './LegTimeEditor';

const ACTION = 'rounded-lg px-3 py-1 text-xs font-semibold';

/**
 * Batch 30: the Operator's shift blocks, grouped Today, Upcoming, Overdue and Past by the Manila business day. Each
 * card's status and section come from the server; the filters work on the loaded cards. The default view is Today and
 * Upcoming, and overdue blocks are announced above it so they are never out of sight. The one "+ Schedule" button
 * lives on the Schedule page, not here.
 */
export default function ShiftBlocksView({ reloadToken = 0 }) {
  const { blocks, blockCards, loading, msg, handleCancel, handleOverrideHandoff, handleMarkReviewed, handleRescheduleLeg } = useShiftBlocksTab(reloadToken);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [view, setView] = useState('current');
  const today = getBusinessToday();

  const options = useMemo(() => filterOptions(blockCards), [blockCards]);
  const groups = useMemo(() => groupBySection(applyFilters(blockCards, filters), today), [blockCards, filters, today]);
  const blockById = useMemo(() => new Map(blocks.map((b) => [Number(b.shift_block_id), b])), [blocks]);

  const changeFilters = (next) => {
    // A date range reaches into the past, so it looks at every section.
    if ((next.from !== filters.from || next.to !== filters.to) && (next.from || next.to) && view === 'current') setView('all');
    setFilters(next);
  };

  const viewOptions = VIEWS.map((v) => {
    const count = v.value === 'overdue' ? groups.overdue.length : v.value === 'past' ? groups.past.length : 0;
    return { value: v.value, label: count > 0 ? `${v.label} (${count})` : v.label };
  });
  const visible = SECTIONS.filter((s) => VIEWS.find((v) => v.value === view).sections.includes(s.key));
  const total = blockCards.length;

  const actionsFor = (card) => {
    const block = blockById.get(Number(card.shift_block_id));
    if (!block) return null;
    const lifecycle = block.lifecycle_status ?? block.status;
    return (
      <>
        {block.status === 'scheduled' && ['scheduled', 'delayed', 'boarding'].includes(lifecycle) && (
          <button type="button" onClick={() => handleCancel(block.shift_block_id)} className={`${ACTION} bg-red-100 text-red-700 hover:bg-red-200`}>Cancel</button>
        )}
        {block.status === 'in_progress' && (
          <button type="button" onClick={() => handleOverrideHandoff(block.shift_block_id)} className={`${ACTION} bg-indigo-100 text-indigo-700 hover:bg-indigo-200`} title="Dispatcher override: force the hand-off regardless of GPS state (exception handling)">Override Hand-off</button>
        )}
        {block.status === 'completed' && block.audit_status === 'pending_review' && (
          <button type="button" onClick={() => handleMarkReviewed(block.shift_block_id)} className={`${ACTION} bg-emerald-100 text-emerald-700 hover:bg-emerald-200`}>Mark Reviewed</button>
        )}
      </>
    );
  };

  return (
    <div className="space-y-4">
      {msg && <p role="status" className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-800">{msg}</p>}

      <ShiftBlockFilterBar filters={filters} onChange={changeFilters} options={options} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Show</span>
        <FilterTabs options={viewOptions} value={view} onChange={setView} />
      </div>

      {view === 'current' && groups.overdue.length > 0 && (
        <div role="note" data-testid="overdue-strip" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <span>{groups.overdue.length} overdue block{groups.overdue.length === 1 ? '' : 's'}: the date has passed and the block was never closed out.</span>
          <button type="button" onClick={() => setView('overdue')} className="font-semibold underline">Show overdue</button>
        </div>
      )}

      {visible.map(({ key, title, empty }) => {
        const list = groups[key];
        return (
          <section key={key} aria-label={title} data-testid={`section-${key}`} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
              <span className="text-xs font-medium text-slate-500">{list.length} block{list.length === 1 ? '' : 's'}</span>
            </div>
            {loading && total === 0 ? (
              <Card padding="sm" data-testid={`loading-${key}`}><p className="text-sm text-slate-500">Loading...</p></Card>
            ) : list.length === 0 ? (
              <Card padding="sm" className="border-dashed" data-testid={`empty-${key}`}>
                <p className="text-sm text-slate-500">{isFiltering(filters) && total > 0 ? 'No blocks match these filters.' : empty}</p>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {list.map((card) => {
                  const block = blockById.get(Number(card.shift_block_id));
                  return (
                    <ShiftBlockCard
                      key={card.key}
                      card={card}
                      showState={showsAssignmentState(card, today)}
                      audit={block && block.audit_status !== 'not_applicable' ? block.audit_status : null}
                      actions={actionsFor(card)}
                      legEditor={block && block.status === 'scheduled' && Array.isArray(block.legs) && block.legs.some((leg) => ['scheduled', 'delayed'].includes(leg.status))
                        ? <LegTimeEditor legs={block.legs} onSave={(tripId, time) => handleRescheduleLeg(block.shift_block_id, tripId, time)} />
                        : null}
                    />
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
