/**
 * 2026-10-27: the Chauffeur's "Download Summary Report" as a CSV file, built only from the Shift Summary numbers the
 * server sent (nothing is worked out here). A missing value reads "Not provided".
 */

const NOT_PROVIDED = 'Not provided';

const cell = (value) => {
  const text = value === null || value === undefined || value === '' ? NOT_PROVIDED : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const money = (value) => (value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? NOT_PROVIDED : Number(value).toFixed(2));

/** @returns {string} the CSV text */
export function shiftSummaryCsv(earnings, { chauffeur = '', date = '' } = {}) {
  const e = earnings || {};
  const rows = [
    ['Shift summary'],
    ['Chauffeur', chauffeur],
    ['Date', date],
    [],
    ['Net revenue (PHP)', money(e.net_total ?? e.total_fare)],
    ['Cash sales (PHP)', money(e.onsite_amount)],
    ['Online sales (PHP)', money(e.online_amount)],
    ['Refunds (PHP)', money(e.refunded_amount)],
    ['Passengers', e.passenger_count],
  ];
  if (e.shift) {
    rows.push(['Cash to hand over (PHP)', money(e.shift.expected_cash)]);
  }
  rows.push([], ['Trip', 'From', 'To', 'Scheduled', 'Left', 'Arrived', 'Passengers', 'Fare (PHP)']);
  (Array.isArray(e.trips) ? e.trips : []).forEach((t) => {
    rows.push([t.trip_id, t.origin, t.destination, t.scheduled_time, t.entry_time, t.exit_time, t.passenger_count, money(t.fare)]);
  });
  const unpaid = Array.isArray(e.unpaid_check_ins) ? e.unpaid_check_ins : [];
  if (unpaid.length > 0) {
    rows.push([], ['Checked in but not paid'], ['Time', 'After stop']);
    unpaid.forEach((c) => rows.push([c.checked_in_at, c.stop_name]));
  }
  return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}

export function shiftSummaryFileName(date) {
  return `shift-summary-${date || 'today'}.csv`;
}

/** Saves the CSV in the browser. */
export function downloadShiftSummary(earnings, meta) {
  const blob = new Blob([shiftSummaryCsv(earnings, meta)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = shiftSummaryFileName(meta?.date);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
