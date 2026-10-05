// Shared look-up for the shift block / trip cards (Driver, Chauffeur and Operator): badge colours, the status text and
// the time range line. The status VALUE always comes from the server (ScheduleStatus); this only names and colours it.

export const STATUS_CLASS = {
  scheduled: 'bg-slate-100 text-slate-700',
  delayed: 'bg-rose-100 text-rose-700',
  boarding: 'bg-sky-100 text-sky-700',
  in_progress: 'bg-teal-100 text-teal-700',
  departed: 'bg-teal-100 text-teal-700',
  'in-progress': 'bg-teal-100 text-teal-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  overdue: 'bg-amber-100 text-amber-800',
};

/** "IN PROGRESS" from "in-progress" / "in_progress"; a missing status reads as scheduled. */
export const statusLabel = (value) => String(value || 'scheduled').replace(/[_-]/g, ' ').toUpperCase();

/** "Departures 06:00 to 13:30", "Departs 09:00" or "Time not set". */
export function timeRange(card) {
  if (!card.start_time) return 'Time not set';
  if (card.legs_count > 1 && card.end_time && card.end_time !== card.start_time) return `Departures ${card.start_time} to ${card.end_time}`;
  return `Departs ${card.start_time}`;
}
