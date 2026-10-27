import { cardSection } from '../../utils/assignmentCards';
import { shiftLabel } from '../../utils/shiftLabel';
import { getBusinessToday, formatManilaDate } from '../../utils/dates';

const CHIP = {
  scheduled: 'bg-slate-100 text-slate-700',
  delayed: 'bg-rose-100 text-rose-700',
  boarding: 'bg-sky-100 text-sky-700',
  'in-progress': 'bg-teal-100 text-teal-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  overdue: 'bg-amber-100 text-amber-800',
};

const SECTIONS = [
  { key: 'overdue', title: 'Overdue' },
  { key: 'today', title: 'Today' },
  { key: 'upcoming', title: 'Upcoming' },
];

const statusOf = (block) => String(block.lifecycle_status || block.status || 'scheduled').replace('_', '-');

function Row({ block, section, actions }) {
  const status = section === 'overdue' ? 'overdue' : statusOf(block);
  const plate = block.fleet?.plate_number;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" data-testid="schedule-row" data-section={section}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{shiftLabel(block.block_type)} - {formatManilaDate(block.scheduled_date) || block.scheduled_date}</p>
          <p className="text-xs text-slate-500">{plate || 'Fleet unavailable'} · {block.legs?.length ?? 0} {(block.legs?.length ?? 0) === 1 ? 'leg' : 'legs'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span data-testid="schedule-status" className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${CHIP[status] || CHIP.scheduled}`}>{status.replace('-', ' ')}</span>
          {actions}
        </div>
      </div>
      {section === 'overdue' && (
        <p className="mt-2 text-xs text-amber-700">This date has passed. Contact your operator.</p>
      )}
    </div>
  );
}

/**
 * "My Schedule" (Driver and Chauffeur, Batch 29): the person's shift blocks with the server's one status (derived
 * from the legs) and section (Manila day). Unfinished days that have passed are Overdue; finished earlier days are
 * Past and tucked away. `renderActions(block, section)` supplies the role's buttons (none for Past).
 */
export default function MyScheduleList({ blocks, renderActions = () => null, today = getBusinessToday() }) {
  const visible = (Array.isArray(blocks) ? blocks : []).filter((b) => statusOf(b) !== 'cancelled');
  const sectionOf = (b) => b.schedule_section || cardSection({ scheduled_date: b.scheduled_date, status: statusOf(b) }, today);
  const by = (key) => visible.filter((b) => sectionOf(b) === key);
  const past = by('past');

  if (visible.length === 0) {
    return <p className="text-sm text-slate-500">Nothing is scheduled for you.</p>;
  }

  return (
    <div className="space-y-4">
      {SECTIONS.map(({ key, title }) => {
        const rows = by(key);
        if (rows.length === 0) return null;
        return (
          <div key={key} data-testid={`schedule-${key}`}>
            <h4 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${key === 'overdue' ? 'text-amber-700' : 'text-slate-500'}`}>{title}</h4>
            <div className="space-y-3">
              {rows.map((block) => <Row key={block.shift_block_id} block={block} section={key} actions={renderActions(block, key)} />)}
            </div>
          </div>
        );
      })}
      {past.length > 0 && (
        <details data-testid="schedule-past" className="rounded-xl border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">Past ({past.length})</summary>
          <div className="mt-3 space-y-3">
            {past.map((block) => <Row key={block.shift_block_id} block={block} section="past" actions={null} />)}
          </div>
        </details>
      )}
    </div>
  );
}
