import { useState } from 'react';
import { OpCard, OpChip, OpTable } from './OperatorUI';
import Pagination from '../../ui/Pagination';
import { useCrewShiftRange } from '../../../api/hooks/Staff/useOperatorDashboardExtras';
import { getBusinessToday } from '../../../utils/dates';
import { endedOnLabel, hoursWorked, rangeProblem } from '../../../utils/crewShift';

// §4.8 and Batch 46: Start Shift and End Shift are the crew's time in and time out. Read only: nothing here changes a
// shift. Breaks are not recorded, so they are not shown or taken off. A shift that ends after midnight shows the day
// it ended next to the time out.

const dayLabel = (isoDate) => {
  const date = isoDate ? new Date(`${isoDate}T00:00:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', weekday: 'short' }) : 'Not provided';
};

const COLUMNS = [
  { key: 'name', header: 'Staff', render: (row) => <span className="font-semibold text-slate-900">{row.name}</span> },
  { key: 'role', header: 'Role', render: (row) => row.role },
  { key: 'bus', header: 'Bus', render: (row) => <span>{row.bus ?? 'Not provided'}<span className="block text-xs text-slate-500">{row.route ?? 'Not provided'}</span></span> },
  { key: 'shift', header: 'Shift', render: (row) => <span>{row.shift}<span className="block text-xs text-slate-500">{dayLabel(row.date)}</span></span> },
  { key: 'time_in', header: 'Time in', render: (row) => <span className="font-data">{row.time_in ?? 'Not provided'}</span> },
  {
    key: 'time_out',
    header: 'Time out',
    render: (row) => (row.open
      ? <OpChip tone="info">In progress</OpChip>
      : <span className="font-data">{row.time_out ?? 'Not provided'}{row.ended_on && <span className="block text-xs text-slate-500">{endedOnLabel(row.ended_on)}</span>}</span>),
  },
  { key: 'hours', header: 'Hours worked', render: (row) => (row.open ? <span className="text-slate-500">In progress</span> : <span className="font-data">{row.minutes == null ? 'Not provided' : hoursWorked(row.minutes)}</span>) },
];

function CrewShiftList({ from, to, staffId }) {
  const [page, setPage] = useState(1);
  const { loading, error, shifts, totals, pagination } = useCrewShiftRange({ from, to, staffId, page });
  if (loading) return <p role="status" className="text-xs text-slate-500">Loading crew times...</p>;
  if (error) return <p role="alert" className="text-xs text-rose-700">{error}</p>;
  return (
    <div className="space-y-4">
      <OpTable
        caption="Crew time in and time out"
        columns={COLUMNS}
        rows={shifts}
        rowKey={(row) => `${row.role}-${row.staff_id}-${row.date}-${row.time_in}`}
        empty="No Driver or Chauffeur started a shift on your buses in these days."
      />
      {pagination.total > 0 && (
        <Pagination label="Crew time pages" page={pagination.page} perPage={pagination.per_page} total={pagination.total} lastPage={pagination.last_page} onPageChange={setPage} />
      )}
      {totals.length > 0 && (
        <section aria-label="Total per person" className="rounded-xl border border-slate-200 p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Total for these days</h4>
          <ul className="grid gap-2 sm:grid-cols-2">
            {totals.map((person) => (
              <li key={`${person.role}-${person.staff_id}`} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-slate-900">{person.name} <span className="text-xs text-slate-500">({person.role})</span></span>
                <span className="font-data text-slate-700">
                  {hoursWorked(person.minutes)} in {person.shifts} shift{person.shifts === 1 ? '' : 's'}{person.still_open ? ', one still in progress' : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const inputClass = 'min-h-11 rounded-lg border border-slate-200 px-2 text-sm text-slate-900';

export default function CrewShiftTimes({ staff = [] }) {
  const today = getBusinessToday();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [staffId, setStaffId] = useState('');
  const problem = rangeProblem(from, to);

  return (
    <OpCard title="Crew time in and out" subtitle="Time in is Start Shift, time out is End Shift, on your buses. Read only. Breaks are not recorded.">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3 text-xs text-slate-600">
          <label className="flex flex-col gap-1">From
            <input type="date" aria-label="From" value={from} max={today} onChange={(event) => setFrom(event.target.value || today)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">To
            <input type="date" aria-label="To" value={to} max={today} onChange={(event) => setTo(event.target.value || today)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">Staff
            <select aria-label="Staff" value={staffId} onChange={(event) => setStaffId(event.target.value)} className={inputClass}>
              <option value="">Everyone</option>
              {staff.map((person) => (
                <option key={person.company_user_id} value={person.company_user_id}>{person.name || person.user?.username || 'Not provided'}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => { setFrom(today); setTo(today); }} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50">Today</button>
        </div>
        {problem
          ? <p role="alert" className="text-sm text-rose-700">{problem}</p>
          /* Keyed by the filters, so a new range starts from page 1 and "Loading" instead of the old rows. */
          : <CrewShiftList key={`${from}-${to}-${staffId}`} from={from} to={to} staffId={staffId || null} />}
      </div>
    </OpCard>
  );
}
