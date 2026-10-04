// Batch 28 Stage 3, item 7: wording and form helpers for the peak-hour duration windows. Factors are CONFIGURED by a
// person (typed, or copied from the read-only report); they are never described as measured, and there are no
// heavy / moderate / normal labels anywhere.

export const DIRECTION_LABELS = { '': 'Both directions', outbound: 'Outbound', reverse: 'Reverse' };
export const DAY_TYPE_LABELS = { '': 'Every day', weekday: 'Weekdays', weekend: 'Weekends' };

export const directionLabel = (value) => DIRECTION_LABELS[value ?? ''] ?? String(value);
export const dayTypeLabel = (value) => DAY_TYPE_LABELS[value ?? ''] ?? String(value);

export const EMPTY_WINDOW = { route_id: '', direction: '', day_type: '', start_time: '07:00', end_time: '09:00', factor: '', note: '', source: 'manual' };

/** The body of a save request: numbers as numbers, empty direction and day type as null (= both / every day). */
export function buildWindowPayload(form) {
  return {
    route_id: Number(form.route_id),
    direction: form.direction || null,
    day_type: form.day_type || null,
    start_time: form.start_time,
    end_time: form.end_time,
    factor: Number(form.factor),
    source: form.source === 'measured' ? 'measured' : 'manual',
    note: String(form.note ?? '').trim() || null,
  };
}

const pad = (n) => String(n).padStart(2, '0');

/**
 * A report row that has enough data becomes a pre-filled form (the hour it covers, its direction, the proposed factor).
 * It is only a starting point: nothing is saved until the person presses Save, and the saved window is labelled
 * "configured", whatever its source.
 */
export function windowFormFromReportRow(row) {
  if (!row?.enough_data || !Number.isFinite(Number(row.proposed_factor))) return null;
  const hour = Number(row.hour);
  return {
    ...EMPTY_WINDOW,
    route_id: String(row.route_id),
    direction: row.direction || '',
    start_time: `${pad(hour)}:00`,
    end_time: hour >= 23 ? '23:59' : `${pad(hour + 1)}:00`,
    factor: String(row.proposed_factor),
    source: 'measured',
    note: `Copied from the duration report: median ${row.median_minutes} min over ${row.samples} legs`,
  };
}

/** "07:00 - 09:00, weekdays, outbound: x1.5". */
export function windowText(window) {
  return `${window.start_time} - ${window.end_time}, ${dayTypeLabel(window.day_type).toLowerCase()}, ${directionLabel(window.direction).toLowerCase()}: x${Number(window.factor)}`;
}
