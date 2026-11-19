/**
 * A fleet report as CSV text (RFC 4180: every cell quoted when it needs it, quotes doubled, CRLF line ends, a UTF-8 BOM
 * so Excel reads the peso sign and accents). A cell that starts with = + - @ (or a tab or return) is prefixed with an
 * apostrophe, so a spreadsheet shows it as text instead of running it as a formula: report cells include names typed by
 * people, and a file that opens on someone's computer must not be able to execute anything.
 *
 * `format` turns one cell value into the text shown on screen, so the file says what the table says.
 */
const NEEDS_QUOTES = /[",\r\n]/;
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value) {
  let text = value == null ? '' : String(value);
  // A plain negative number is a number, not a formula.
  if (FORMULA_START.test(text) && !/^-\d+(\.\d+)?$/.test(text)) text = `'${text}`;
  return NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function reportToCsv(columns, rows, format = (value) => value) {
  const header = columns.map((column) => csvCell(column.replace(/_/g, ' '))).join(',');
  const lines = rows.map((row) => columns.map((column) => csvCell(format(row?.[column]))).join(','));
  return `\uFEFF${[header, ...lines].join('\r\n')}\r\n`;
}

/** "fleet-report-adherence-ABC-123-2026-10-01_to_2026-10-09.csv": letters, digits, dot, dash and underscore only. */
export function reportFileName({ type, fleet, from, to }) {
  const safe = (part) => String(part || '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  const range = from || to ? `${safe(from) || 'start'}_to_${safe(to) || 'today'}` : 'month-to-date';
  return ['fleet-report', safe(type), safe(fleet), range].filter(Boolean).join('-') + '.csv';
}
