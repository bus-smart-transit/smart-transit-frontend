import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendarDay } from '../../api/hooks/Staff/useStaffCalendar';
import { ROLE_LABEL, STATUS_COLOR, formatDayLabel, formatTime } from '../../utils/staffSchedule';

const statusStyle = (status) => {
  const color = STATUS_COLOR[status] || '#153a6b';
  return { background: `${color}20`, color };
};

/**
 * The trips and shift legs of ONE day, paginated by the server. The single list used by the calendar
 * modal and by the day panel of the full calendar page, so both always show the same thing. Each row:
 * time, the leg's own origin to destination, status and the caller's role in it.
 */
export default function DayTrips({ service, date, refreshKey = 0, onOpenFull = null, heading = true }) {
  const [page, setPage] = useState(1);
  const day = useCalendarDay(service, date, page, refreshKey);

  return (
    <section aria-label={`Trips on ${formatDayLabel(date)}`}>
      {heading && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-base font-bold text-slate-900">{formatDayLabel(date)}</h3>
          {!day.loading && !day.error && (
            <p className="text-xs font-medium text-slate-500">{day.total} item{day.total === 1 ? '' : 's'}</p>
          )}
        </div>
      )}

      {day.loading && <p className="py-4 text-sm text-slate-500" role="status">Loading...</p>}
      {day.error && <p className="py-4 text-sm text-red-600" role="alert">{day.error}</p>}

      {!day.loading && !day.error && day.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">Nothing scheduled this day.</div>
      )}

      {!day.loading && day.items.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {day.items.map((item) => (
            <li key={item.trip_id} className="flex items-start justify-between gap-3 px-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  <span className="font-data mr-2 text-teal-700">{formatTime(item.departure_time) || '--:--'}</span>
                  {item.origin || '-'} &rarr; {item.destination || '-'}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {item.type === 'shift' ? 'Shift leg' : 'Trip'}
                  {item.route_name ? ` \u00b7 ${item.route_name}` : ''}
                  {item.plate_number ? ` \u00b7 ${item.plate_number}` : ''}
                  {` \u00b7 ${ROLE_LABEL[item.role] || item.role}`}
                </p>
              </div>
              <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" style={statusStyle(item.status)}>
                {(item.status || 'pending').toUpperCase()}
              </span>
            </li>
          ))}
        </ul>
      )}

      {day.lastPage > 1 && (
        <nav aria-label="Day pages" className="mt-3 flex items-center justify-center gap-3">
          <button type="button" disabled={day.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 enabled:hover:bg-slate-50 disabled:opacity-50">
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </button>
          <span className="text-xs font-medium text-slate-600" aria-live="polite">Page {day.page} of {day.lastPage}</span>
          <button type="button" disabled={day.page >= day.lastPage} onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 enabled:hover:bg-slate-50 disabled:opacity-50">
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </nav>
      )}

      {onOpenFull && (
        <div className="mt-4 text-right">
          <button type="button" onClick={() => onOpenFull(date)} className="text-sm font-semibold text-teal-700 hover:text-teal-800">Open full schedule &rarr;</button>
        </div>
      )}
    </section>
  );
}
