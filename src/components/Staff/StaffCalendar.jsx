import { useState } from 'react';
import CalendarMonthGrid from './CalendarMonthGrid';
import DayTrips from './DayTrips';
import Modal from '../ui/Modal';
import { getBusinessToday } from '../../utils/dates';
import { monthStartOf } from '../../utils/staffSchedule';

/**
 * The full calendar page for Driver, Chauffeur and Operator: the month grid with the server's day
 * markers, and below it the list of the chosen day (the same DayTrips the dashboard modal uses).
 * `initialDate` ('YYYY-MM-DD') opens on that day, for the "Open full schedule" link; otherwise today
 * (Manila). Month view only: a day's list is the day view.
 *
 * Batch 46: with `onOpenTrip` (the Operator's Schedule), choosing a day opens a pop-up with that day's
 * trips instead of a card below, and choosing a trip calls onOpenTrip(item).
 */
export default function StaffCalendar({ service, initialDate = null, refreshKey = 0, onOpenTrip = null }) {
  const [month, setMonth] = useState(() => monthStartOf(initialDate));
  const [selectedDate, setSelectedDate] = useState(initialDate || getBusinessToday());
  const [popupDate, setPopupDate] = useState(onOpenTrip && initialDate ? initialDate : null);

  if (onOpenTrip) {
    return (
      <>
        <section className="staff-card" aria-label="Calendar">
          <CalendarMonthGrid
            service={service}
            month={month}
            onMonthChange={setMonth}
            selectedDate={popupDate}
            onSelectDate={setPopupDate}
            refreshKey={refreshKey}
          />
        </section>
        <Modal open={popupDate !== null} onClose={() => setPopupDate(null)} title="Trips for the day" size="md" fullScreenOnMobile>
          {popupDate !== null && (
            <DayTrips
              key={popupDate}
              service={service}
              date={popupDate}
              refreshKey={refreshKey}
              onOpenTrip={(item) => { setPopupDate(null); onOpenTrip(item); }}
            />
          )}
        </Modal>
      </>
    );
  }

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
