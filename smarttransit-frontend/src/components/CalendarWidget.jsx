const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarWidget({ year, month, highlightDays = [] }) {
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  return (
    <div>
      <p className="text-center text-sm font-semibold text-navy-950">
        {MONTH_NAMES[month]} {year}
      </p>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) =>
          day === null ? (
            <span key={`blank-${index}`} />
          ) : (
            <span
              key={day}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                highlightDays.includes(day)
                  ? "bg-navy-800 font-semibold text-white"
                  : "text-slate-600"
              }`}
            >
              {day}
            </span>
          )
        )}
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <span className="h-2.5 w-2.5 rounded-full bg-navy-800" /> Upcoming trip
      </p>
    </div>
  );
}
