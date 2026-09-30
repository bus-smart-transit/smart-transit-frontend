import { useCalendarSummary } from '../../api/hooks/Staff/useCalendarSummary';

// Dates arrive as business-day 'YYYY-MM-DD' strings; format them without
// going through the browser's timezone.
const formatShortDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '-';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const formatTime = (value) => {
  const match = String(value || '').match(/^(\d{2}:\d{2})/);
  return match ? match[1] : '';
};

const Stat = ({ label, children }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-0.5 text-sm font-semibold text-slate-900">{children}</p>
  </div>
);

/**
 * Summary strip shown above the calendar (Driver, Chauffeur) or on the
 * dashboard (Operator). All figures come from GET /staff/calendar-summary.
 */
export default function CalendarSummaryStrip({ service, refreshKey, className = '' }) {
  const { summary, error } = useCalendarSummary(service, refreshKey);

  if (!summary) {
    return error ? <p className={`text-xs text-slate-500 ${className}`}>Calendar summary is unavailable right now.</p> : null;
  }

  const { today, week, next } = summary;
  const nextLabel = next
    ? `${formatShortDate(next.date)}${next.departure_time ? ` ${formatTime(next.departure_time)}` : ''} · ${next.route_name || `${next.origin || '-'} → ${next.destination || '-'}`}`
    : 'Nothing upcoming';

  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-4 ${className}`}>
      <Stat label="Today">{today.trips} trips · {today.shifts} shifts</Stat>
      <Stat label="This week">{week.trips} trips · {week.shifts} shifts</Stat>
      <Stat label={next ? `Next ${next.type}` : 'Next'}>{nextLabel}</Stat>
      {typeof summary.for_approval_count === 'number' && (
        <Stat label="For Approval">{summary.for_approval_count} request(s)</Stat>
      )}
    </div>
  );
}
