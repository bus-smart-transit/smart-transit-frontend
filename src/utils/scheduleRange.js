// Phase B (smarttransit_prompt.md §4.13): scheduling the same shift block on every day From..To. The server decides
// which days are created (POST operator/shift-blocks/range); these helpers only shape the form and the preview.

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LEG_TIMES = ['06:00', '08:30', '11:00', '13:30'];

/** Number of calendar days From..To, both included; 0 when either is missing or To is before From. */
export function rangeDayCount(from, to) {
  if (!from || !to) return 0;
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / DAY_MS) + 1;
}

/** A multi-leg form with a To date after its From date: it goes through preview and confirm. */
export function isRangeSchedule(form) {
  return form?.trip_type === 'round_trip' && rangeDayCount(form?.trip_date, form?.to_date) > 1;
}

/** The request body for both range calls (From is the form's trip_date). */
export function rangePayload(form) {
  return {
    fleet_route_id: Number(form.fleet_route_id),
    driver_id: Number(form.driver_id),
    conductor_id: Number(form.conductor_id),
    block_type: form.block_type,
    from_date: form.trip_date,
    to_date: form.to_date,
    service_type: form.service_type || 'regular',
    leg_departure_times: Array.isArray(form.leg_departure_times) ? form.leg_departure_times : DEFAULT_LEG_TIMES,
  };
}

/** Identifies what a preview was made for; when the form no longer matches it, the preview is out of date. */
export function rangeKey(form) {
  return JSON.stringify(rangePayload(form));
}

/** "Wed, Oct 7" for a Y-m-d date, read as a calendar day (no timezone shift). */
export function formatRangeDay(date) {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed)) return String(date ?? '');
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(parsed));
}

/** The confirm button's words for a preview: "Schedule 1 day", "Schedule 4 days". */
export function scheduleButtonLabel(createCount) {
  return createCount === 1 ? 'Schedule 1 day' : `Schedule ${createCount} days`;
}
