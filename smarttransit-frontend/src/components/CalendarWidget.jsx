import "./CalendarWidget.css";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// A small month-grid calendar, built with plain JS Date math (no
// date library needed). `highlightDays` marks specific day numbers
// as "you have a trip that day" -- pass in whichever days matter.
export default function CalendarWidget({ year, month, highlightDays = [] }) {
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }

  return (
    <div className="calendar-widget">
      <p className="calendar-widget__title">
        {MONTH_NAMES[month]} {year}
      </p>

      <div className="calendar-widget__grid calendar-widget__grid--weekdays">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="calendar-widget__grid">
        {cells.map((day, index) =>
          day === null ? (
            <span key={`blank-${index}`} />
          ) : (
            <span
              key={day}
              className={
                highlightDays.includes(day)
                  ? "calendar-widget__day calendar-widget__day--highlight"
                  : "calendar-widget__day"
              }
            >
              {day}
            </span>
          )
        )}
      </div>

      <p className="calendar-widget__legend">
        <span className="calendar-widget__legend-dot" /> Upcoming trip
      </p>
    </div>
  );
}
