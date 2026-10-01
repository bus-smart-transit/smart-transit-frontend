import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendarMonth } from '../../api/hooks/Staff/useStaffCalendar';
import { formatDayLabel, monthStartOf, shiftMonth } from '../../utils/staffSchedule';

const WEEKDAYS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_COMPACT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const countLabel = (marker) => {
  if (!marker) return '';
  const parts = [`${marker.trips} trip${marker.trips === 1 ? '' : 's'}`];
  if (marker.shifts > 0) parts.push(`${marker.shifts} shift${marker.shifts === 1 ? '' : 's'}`);
  return parts.join(', ');
};

/**
 * One month, one page at a time, with the server's day markers (trips and shifts of the caller's
 * own scope, Manila days). `compact` is the dashboard widget: a fixed, small grid that never grows
 * with the data; the full calendar page uses the roomier cells. The grid is always 6 weeks tall, so
 * paging between months or loading markers never changes its height.
 */
export default function CalendarMonthGrid({ service, month, onMonthChange, selectedDate = null, onSelectDate, compact = false, refreshKey = 0, footer = null }) {
  const { cells, loading, error } = useCalendarMonth(service, month, refreshKey);
  const weekdays = compact ? WEEKDAYS_COMPACT : WEEKDAYS_FULL;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className={`font-bold text-slate-900 ${compact ? 'text-base' : 'text-lg'}`}>
          {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h4>
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label="Previous month" className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
            onClick={() => onMonthChange(shiftMonth(month, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            onClick={() => onMonthChange(monthStartOf(null))}>
            Today
          </button>
          <button type="button" aria-label="Next month" className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
            onClick={() => onMonthChange(shiftMonth(month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400" aria-hidden="true">
        {weekdays.map((d, i) => <div key={i} className="py-1">{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1" aria-busy={loading}>
        {cells.map((cell) => {
          const selected = selectedDate === cell.dateKey;
          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => onSelectDate(cell.dateKey)}
              aria-pressed={selected}
              aria-label={`${formatDayLabel(cell.dateKey)}${cell.marker ? `, ${countLabel(cell.marker)}` : ''}`}
              className={`relative flex rounded-lg border text-left transition hover:bg-teal-50 ${
                compact ? 'h-8 items-center justify-center text-xs' : 'h-16 items-start justify-start p-1.5 text-sm sm:h-20'
              } ${cell.isCurrentMonth ? 'bg-white text-slate-700' : 'bg-slate-50 text-slate-300'} ${
                selected ? 'border-teal-500 ring-2 ring-teal-200' : cell.isToday ? 'border-teal-400 ring-1 ring-teal-200' : 'border-slate-100'
              } font-semibold`}
            >
              {cell.date.getDate()}
              {cell.marker && compact && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />}
              {cell.marker && !compact && (
                <span className="absolute inset-x-1.5 bottom-1.5 flex flex-wrap items-center gap-1 text-[11px] font-semibold">
                  <span className="rounded bg-teal-100 px-1.5 py-0.5 text-teal-800">{cell.marker.trips} trip{cell.marker.trips === 1 ? '' : 's'}</span>
                  {cell.marker.shifts > 0 && <span className="hidden rounded bg-sky-100 px-1.5 py-0.5 text-sky-800 sm:inline">{cell.marker.shifts} shift{cell.marker.shifts === 1 ? '' : 's'}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>}
      {footer}
    </div>
  );
}
