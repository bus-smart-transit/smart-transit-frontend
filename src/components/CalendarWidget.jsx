import { useState } from "react";
import { ChevronRightIcon } from "./Icons.jsx";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const dayKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

// Opens on the current month and highlights today. `tripDates` is a list of date strings
// (e.g. "June 10, 2026") that get marked as upcoming trips.
export default function CalendarWidget({ tripDates = [] }) {
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const tripKeys = new Set(
    tripDates.map((value) => new Date(value)).filter((d) => !isNaN(d)).map(dayKey)
  );

  const firstDayOfMonth = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  const shiftMonth = (delta) =>
    setView(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  const isCurrentMonth = view.year === today.getFullYear() && view.month === today.getMonth();

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-navy-900"
        >
          <ChevronRightIcon size={16} className="rotate-180" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-navy-950">
            {MONTH_NAMES[view.month]} {view.year}
          </p>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => setView({ year: today.getFullYear(), month: today.getMonth() })}
              className="text-xs font-semibold text-teal-600 hover:underline"
            >
              Back to today
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-navy-900"
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />;

          const key = dayKey(new Date(view.year, view.month, day));
          const isToday = key === dayKey(today);
          const hasTrip = tripKeys.has(key);

          let style = "text-slate-600";
          if (hasTrip) style = "bg-navy-800 font-semibold text-white";
          else if (isToday) style = "bg-teal-100 font-semibold text-teal-800 ring-2 ring-teal-400";

          return (
            <span
              key={day}
              aria-current={isToday ? "date" : undefined}
              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm ${style}`}
            >
              {day}
            </span>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-400" /> Today
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-navy-800" /> Upcoming trip
        </span>
      </div>
    </div>
  );
}
