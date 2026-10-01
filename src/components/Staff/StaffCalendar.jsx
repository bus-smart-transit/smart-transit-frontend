import { useState } from 'react';
import CalendarMonthGrid from './CalendarMonthGrid';
import DayTrips from './DayTrips';
import { getBusinessToday } from '../../utils/dates';
import { monthStartOf } from '../../utils/staffSchedule';

/**
 * The full calendar page for Driver, Chauffeur and Operator: the month grid with the server's day
 * markers, and below it the list of the chosen day (the same DayTrips the dashboard modal uses).
 * `initialDate` ('YYYY-MM-DD') opens on that day, for the "Open full schedule" link; otherwise today
 * (Manila). Month view only: a day's list is the day view.
 */
export default function StaffCalendar({ service, initialDate = null, refreshKey = 0 }) {
  const [month, setMonth] = useState(() => monthStartOf(initialDate));
  const [selectedDate, setSelectedDate] = useState(initialDate || getBusinessToday());

  return (
    <div className="space-y-5">
      <section className="staff-card" aria-label="Calendar">
        <CalendarMonthGrid
          service={service}
          month={month}
          onMonthChange={setMonth}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          refreshKey={refreshKey}
        />
      </section>
      <section className="staff-card">
        <DayTrips key={selectedDate} service={service} date={selectedDate} refreshKey={refreshKey} />
      </section>
    </div>
  );
}
