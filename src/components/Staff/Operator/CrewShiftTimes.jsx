import { useState } from 'react';
import { OpCard, OpChip, OpTable } from './OperatorUI';
import { useCrewShifts } from '../../../api/hooks/Staff/useOperatorDashboardExtras';
import { getBusinessToday } from '../../../utils/dates';
import { shiftLength } from '../../../utils/crewShift';

// §4.8: Start Shift and End Shift are the crew's time in and time out. Read only: nothing here changes a shift.

const COLUMNS = [
  { key: 'name', header: 'Crew', render: (row) => <span className="font-semibold text-slate-900">{row.name}<span className="block text-xs font-normal text-slate-500">{row.role}</span></span> },
  { key: 'bus', header: 'Bus and route', render: (row) => <span>{row.bus ?? 'Not provided'}<span className="block text-xs text-slate-500">{row.route ?? 'Not provided'}</span></span> },
  { key: 'time_in', header: 'Time in', render: (row) => <span className="font-data">{row.time_in}</span> },
  { key: 'time_out', header: 'Time out', render: (row) => (row.open ? <OpChip tone="info">Still on shift</OpChip> : <span className="font-data">{row.time_out}</span>) },
  { key: 'length', header: 'Length', render: (row) => <span className="font-data">{shiftLength(row.minutes)}</span> },
];

function CrewShiftList({ date }) {
  const { loading, error, shifts } = useCrewShifts(date);
  if (loading) return <p role="status" className="text-xs text-slate-500">Loading crew times...</p>;
  if (error) return <p role="alert" className="text-xs text-rose-700">{error}</p>;
  return (
    <OpTable
      caption="Crew time in and time out"
      columns={COLUMNS}
      rows={shifts}
      rowKey={(row) => `${row.role}-${row.name}-${row.bus}-${row.time_in}`}
      empty="No Driver or Chauffeur started a shift on your buses this day."
    />
  );
}

export default function CrewShiftTimes() {
  const [date, setDate] = useState(getBusinessToday());
  return (
    <OpCard
      title="Crew time in and out"
      subtitle="Time in is Start Shift, time out is End Shift, on your buses. Read only."
      badge={(
        <label className="flex items-center gap-2 text-xs text-slate-600">
          Day
          <input type="date" aria-label="Day" value={date} onChange={(event) => setDate(event.target.value || getBusinessToday())} className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900" />
        </label>
      )}
    >
      {/* Keyed by day, so a new day starts from "Loading" instead of showing the previous day's rows. */}
      <CrewShiftList key={date} date={date} />
    </OpCard>
  );
}
