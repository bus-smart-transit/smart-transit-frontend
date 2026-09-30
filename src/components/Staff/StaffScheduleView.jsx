import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildCalendarGrid } from '../../utils/calendarGrid';
import { STATUS_COLOR, formatDayLabel, formatTripSchedule, groupTripsByDate, monthStartOf, splitSchedule } from '../../utils/staffSchedule';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const statusStyle = (status) => {
  const color = STATUS_COLOR[status] || '#153a6b';
  return { background: `${color}20`, color };
};

function TripRow({ trip, onSelectTrip }) {
  const route = trip.fleet_route?.route;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelectTrip?.(trip)}
        disabled={!onSelectTrip}
        className="flex w-full items-center justify-between gap-3 py-3 text-left enabled:hover:bg-slate-50 disabled:cursor-default"
      >
        <span>
          <span className="block text-sm font-semibold text-slate-900">{route?.origin || '-'} → {route?.destination || '-'}</span>
          <span className="block font-data text-xs text-slate-500">
            {formatTripSchedule(trip)}{trip.fleet_route?.fleet?.plate_number ? ` · ${trip.fleet_route.fleet.plate_number}` : ''}
          </span>
        </span>
        <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={statusStyle(trip.status)}>
          {(trip.status || 'pending').toUpperCase()}
        </span>
      </button>
    </li>
  );
}

const PAGE_SIZE = 8;

function TripList({ title, trips, emptyText, onSelectTrip }) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const remaining = trips.length - shown;
  return (
    <div className="staff-card">
      <h4 className="mb-3 text-base font-bold text-slate-900">{title}</h4>
      {trips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">{emptyText}</div>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {trips.slice(0, shown).map((trip) => <TripRow key={trip.trip_id} trip={trip} onSelectTrip={onSelectTrip} />)}
          </ul>
          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE_SIZE)}
              className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Show {Math.min(PAGE_SIZE, remaining)} more ({remaining} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * The one Schedule view used by the Driver and Chauffeur Schedule pages and by
 * the dashboard calendar modal (Driver, Chauffeur, Operator). It renders the
 * trips it is given; callers own the data fetch. `focusDate` ('YYYY-MM-DD')
 * opens on that month with the day selected.
 */
export default function StaffScheduleView({ trips, focusDate = null, onSelectTrip }) {
  const [month, setMonth] = useState(() => monthStartOf(focusDate));
  const [selectedDate, setSelectedDate] = useState(focusDate);

  const tripsByDate = groupTripsByDate(trips);
  const days = buildCalendarGrid(month, tripsByDate);
  const { upcoming, past } = splitSchedule(trips);
  const selectedTrips = selectedDate ? tripsByDate[selectedDate] || [] : [];

  return (
    <div className="space-y-5">
      <section className="staff-card" aria-label="Schedule calendar">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-base font-bold text-slate-900">
            {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h4>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50"
              onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              onClick={() => setMonth(monthStartOf(null))}
            >
              Today
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50"
              onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
          {WEEKDAYS.map((d) => <div key={d} className="py-1.5">{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((cell) => (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => setSelectedDate((prev) => (prev === cell.dateKey ? null : cell.dateKey))}
              aria-pressed={selectedDate === cell.dateKey}
              aria-label={`${formatDayLabel(cell.dateKey)}, ${cell.trips.length} trip${cell.trips.length === 1 ? '' : 's'}`}
              className={`flex min-h-16 flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition sm:min-h-20 ${
                cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50 text-slate-300'
              } ${selectedDate === cell.dateKey ? 'border-teal-500 ring-2 ring-teal-200' : cell.isToday ? 'border-teal-400 ring-1 ring-teal-200' : 'border-slate-100'} ${
                cell.trips.length > 0 ? 'hover:bg-teal-50' : ''
              }`}
            >
              <span className={`text-xs font-semibold ${cell.isToday ? 'text-teal-600' : cell.isCurrentMonth ? 'text-slate-700' : 'text-slate-300'}`}>
                {cell.date.getDate()}
              </span>
              {cell.trips.slice(0, 2).map((t) => (
                <span key={t.trip_id} className="hidden w-full truncate rounded px-1 py-0.5 text-xs font-semibold sm:block" style={statusStyle(t.status)}>
                  {t.fleet_route?.route?.route_name || `Trip #${t.trip_id}`}
                </span>
              ))}
              {cell.trips.length > 0 && (
                <span className="text-xs text-slate-400 sm:hidden">{cell.trips.length} trip{cell.trips.length === 1 ? '' : 's'}</span>
              )}
              {cell.trips.length > 2 && <span className="hidden text-xs text-slate-400 sm:block">+{cell.trips.length - 2} more</span>}
            </button>
          ))}
        </div>
      </section>

      {selectedDate && (
        <TripList
          title={formatDayLabel(selectedDate)}
          trips={selectedTrips}
          emptyText="No trips scheduled this day."
          onSelectTrip={onSelectTrip}
        />
      )}
      <TripList title="Upcoming" trips={upcoming} emptyText="No upcoming trips scheduled." onSelectTrip={onSelectTrip} />
      <TripList title="Past" trips={past} emptyText="No past trips yet." onSelectTrip={onSelectTrip} />
    </div>
  );
}
