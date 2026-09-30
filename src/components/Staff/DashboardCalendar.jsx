import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from '../ui/Modal';
import StaffScheduleView from './StaffScheduleView';
import { buildCalendarGrid } from '../../utils/calendarGrid';
import { getBusinessToday } from '../../utils/dates';
import { groupTripsByDate, monthStartOf } from '../../utils/staffSchedule';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Compact month calendar for the Driver, Chauffeur and Operator dashboards.
 * Days with trips are marked. Pressing a day opens the shared Schedule view in
 * a modal focused on that day; pressing the card (or its button) opens it on
 * today. It reads the trips its dashboard already loaded, so it adds no fetch.
 */
export default function DashboardCalendar({ trips, onSelectTrip, className = '' }) {
  const [month, setMonth] = useState(() => monthStartOf(null));
  const [focusDate, setFocusDate] = useState(null); // null = closed

  const days = buildCalendarGrid(month, groupTripsByDate(trips));
  const open = (dateKey) => setFocusDate(dateKey || getBusinessToday());
  const stop = (handler) => (event) => { event.stopPropagation(); handler(); };

  return (
    <>
      <section
        className={`staff-card cursor-pointer ${className}`}
        aria-label="Schedule calendar"
        onClick={() => open(null)}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Calendar</p>
            <h4 className="text-base font-bold text-slate-900">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h4>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Previous month" className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
              onClick={stop(() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)))}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Next month" className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
              onClick={stop(() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)))}>
              <ChevronRight className="h-4 w-4" />
            </button>
            <button type="button" className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
              onClick={stop(() => open(null))}>
              <CalendarDays className="h-3.5 w-3.5" /> Open schedule
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-slate-400">
          {WEEKDAYS.map((d, i) => <div key={i} className="py-1">{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((cell) => (
            <button
              key={cell.dateKey}
              type="button"
              aria-label={`${cell.dateKey}${cell.trips.length ? `, ${cell.trips.length} trip${cell.trips.length === 1 ? '' : 's'}` : ''}`}
              onClick={stop(() => open(cell.dateKey))}
              className={`relative flex h-9 items-center justify-center rounded-lg border text-xs font-semibold transition hover:bg-teal-50 ${
                cell.isCurrentMonth ? 'text-slate-700' : 'text-slate-300'
              } ${cell.isToday ? 'border-teal-400 ring-1 ring-teal-200' : 'border-transparent'}`}
            >
              {cell.date.getDate()}
              {cell.trips.length > 0 && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </section>

      <Modal open={focusDate !== null} onClose={() => setFocusDate(null)} title="Schedule" size="xl" fullScreenOnMobile>
        {focusDate !== null && (
          <StaffScheduleView
            key={focusDate}
            trips={trips}
            focusDate={focusDate}
            onSelectTrip={onSelectTrip ? (trip) => { setFocusDate(null); onSelectTrip(trip); } : undefined}
          />
        )}
      </Modal>
    </>
  );
}
