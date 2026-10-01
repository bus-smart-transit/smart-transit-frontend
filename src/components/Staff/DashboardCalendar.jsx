import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import Modal from '../ui/Modal';
import CalendarMonthGrid from './CalendarMonthGrid';
import DayTrips from './DayTrips';
import { monthStartOf } from '../../utils/staffSchedule';

/**
 * The calendar widget on the Driver, Chauffeur and Operator dashboards: one compact month at a time
 * with previous/next paging, a fixed height, today highlighted and a marker on every day that has trips
 * or shifts (from the server, for the caller's own scope). Pressing a day opens a modal with only that
 * day's trips and shifts; "Full calendar" goes to the calendar page. Adds no load beyond the markers
 * for the month on screen.
 */
export default function DashboardCalendar({ service, onOpenFull, refreshKey = 0, className = '' }) {
  const [month, setMonth] = useState(() => monthStartOf(null));
  const [day, setDay] = useState(null); // 'YYYY-MM-DD' of the open modal, or null

  return (
    <>
      <section className={`staff-card ${className}`} aria-label="Calendar widget">
        <CalendarMonthGrid
          service={service}
          month={month}
          onMonthChange={setMonth}
          selectedDate={day}
          onSelectDate={setDay}
          compact
          refreshKey={refreshKey}
          actions={(
            <button type="button" onClick={() => onOpenFull(null)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
              <CalendarDays className="h-3.5 w-3.5" /> Full calendar
            </button>
          )}
        />
      </section>

      <Modal open={day !== null} onClose={() => setDay(null)} title="Schedule for the day" size="md" fullScreenOnMobile>
        {day !== null && (
          <DayTrips
            key={day}
            service={service}
            date={day}
            refreshKey={refreshKey}
            onOpenFull={(date) => { setDay(null); onOpenFull(date); }}
          />
        )}
      </Modal>
    </>
  );
}
