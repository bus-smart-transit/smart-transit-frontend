import { addDaysToDate, formatCalendarDate } from './bookingQuery';

// Batch 29, Stage 2: display helpers for the Operator financial page. Nothing here computes a fare or a total:
// every amount shown comes from the server's stored ticket and payment amounts.

const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

export const formatPeso = (value) => PESO.format(Number(value || 0));

export const formatCount = (value) => Number(value || 0).toLocaleString('en-PH');

export const formatPercent = (value) => `${Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 1 })}%`;

/** "Oct 5, 2026 06:04" from the server's Manila "YYYY-MM-DD HH:MM:SS". */
export function formatPaidAt(value) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  return match ? `${formatCalendarDate(match[1])} ${match[2]}` : '';
}

/** The quick date ranges, from the Manila business date. */
export const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'month', label: 'This month' },
];

export function presetRange(key, today) {
  switch (key) {
    case 'yesterday': {
      const day = addDaysToDate(today, -1);
      return { from: day, to: day };
    }
    case 'last7':
      return { from: addDaysToDate(today, -6), to: today };
    case 'month':
      return { from: `${today.slice(0, 8)}01`, to: today };
    default:
      return { from: today, to: today };
  }
}

/** The Payment select offers Cash, Online, and each online channel that has data. */
export function paymentFilterValue(filters) {
  if (filters.channel) return `channel:${filters.channel}`;
  if (filters.payment_method) return `method:${filters.payment_method}`;
  return '';
}

export function paymentFilterPatch(value) {
  if (value.startsWith('channel:')) return { payment_method: '', channel: value.slice(8) };
  if (value.startsWith('method:')) return { payment_method: value.slice(7), channel: '' };
  return { payment_method: '', channel: '' };
}

/** Only the filters that are set go to the server. */
export function filtersToParams(filters, extra = {}) {
  const params = {};
  Object.entries({ ...filters, ...extra }).forEach(([key, value]) => {
    if (value !== '' && value != null) params[key] = value;
  });
  return params;
}

export const STATUS_STYLE = {
  paid: 'bg-emerald-100 text-emerald-700',
  refunded: 'bg-rose-100 text-rose-700',
  partially_refunded: 'bg-amber-100 text-amber-800',
  refund_pending: 'bg-sky-100 text-sky-700',
};

/** Turns a downloaded CSV string into a file the browser saves. */
export function saveCsv(text, fileName) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function csvFileName(type, filters) {
  const range = filters.from === filters.to ? filters.from : `${filters.from}_to_${filters.to}`;
  return `financial-${type}-${range}.csv`;
}

/**
 * Batch 48 Phase 5: the daily rows of a financial report added up per month ("2026-11"), for the Super Admin's
 * platform revenue. Fares kept and booking fees kept stay apart.
 */
export function monthTotals(daily = []) {
  const months = new Map();
  for (const day of daily) {
    const key = String(day.date || '').slice(0, 7);
    if (!key) continue;
    const row = months.get(key) || { month: key, tickets: 0, net: 0, booking_fees: 0 };
    row.tickets += Number(day.tickets || 0);
    row.net = Math.round((row.net + Number(day.net || 0)) * 100) / 100;
    row.booking_fees = Math.round((row.booking_fees + Number(day.booking_fees || 0)) * 100) / 100;
    months.set(key, row);
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}
