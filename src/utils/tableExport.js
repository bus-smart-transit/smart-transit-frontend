/**
 * 2026-11-08 (advisor, user): every report download offers a file type, PDF or CSV. The one owner of turning a
 * report's CSV text (built by the server or by the page, unchanged) into the file the person asked for. The PDF holds
 * the same cells as the CSV; nothing is worked out here. jsPDF is loaded only when a PDF is asked for.
 */

export const FILE_TYPES = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
];
export const DEFAULT_FILE_TYPE = 'pdf';

/** RFC 4180 CSV text to rows of cells (quoted cells, doubled quotes, CRLF or LF). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const src = String(text ?? '').replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') { quoted = false; } else { cell += ch; }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

// The server guards spreadsheet formulas with a leading apostrophe ('=, '+, '-, '@); a PDF shows the plain value.
const pdfCell = (value) => (/^'[=+\-@]/.test(value) ? value.slice(1) : value);

/**
 * Rows to PDF blocks, split at blank rows: a lone one-cell row is a heading; a block of label/value pairs (two cells
 * or fewer) is a table without a header; any other block is a table whose first row is the header.
 */
export function csvBlocks(rows) {
  const blocks = [];
  let current = [];
  const flush = () => {
    if (current.length === 0) return;
    const chunk = current;
    current = [];
    if (chunk.length === 1 && chunk[0].length === 1) { blocks.push({ kind: 'heading', text: pdfCell(chunk[0][0]) }); return; }
    if (chunk[0].length === 1 && chunk.length > 1) {
      blocks.push({ kind: 'heading', text: pdfCell(chunk[0][0]) });
      chunk.shift();
    }
    if (chunk.every((r) => r.length <= 2)) blocks.push({ kind: 'pairs', body: chunk.map((r) => r.map(pdfCell)) });
    else blocks.push({ kind: 'table', head: chunk[0].map(pdfCell), body: chunk.slice(1).map((r) => r.map(pdfCell)) });
  };
  rows.forEach((r) => {
    if (r.length === 0 || r.every((c) => c === '')) flush();
    else current.push(r);
  });
  flush();
  return blocks;
}

/** The file name for the chosen type: "report.csv" becomes "report.pdf". */
export function fileNameFor(fileName, format) {
  const base = String(fileName || 'report').replace(/\.(csv|pdf)$/i, '');
  return `${base}.${format === 'pdf' ? 'pdf' : 'csv'}`;
}

function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Builds the PDF document (exported for tests). */
export async function buildPdf(csvText, { title = '', subtitle = '' } = {}) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const blocks = csvBlocks(parseCsv(csvText));
  const widest = Math.max(0, ...blocks.map((b) => (b.kind === 'table' ? b.head.length : 2)));
  const doc = new jsPDF({ orientation: widest > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const margin = 40;
  let y = margin;
  if (title) { doc.setFontSize(14); doc.text(title, margin, y); y += 18; }
  if (subtitle) { doc.setFontSize(9); doc.setTextColor(100); doc.text(subtitle, margin, y); doc.setTextColor(0); y += 14; }
  const styles = { fontSize: 8, cellPadding: 3, overflow: 'linebreak' };
  blocks.forEach((block) => {
    if (block.kind === 'heading') {
      y += 6;
      doc.setFontSize(11);
      doc.text(block.text, margin, y);
      y += 6;
      return;
    }
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      styles,
      headStyles: { fillColor: [15, 118, 110] },
      ...(block.kind === 'table' ? { head: [block.head], body: block.body } : { body: block.body, columnStyles: { 0: { fontStyle: 'bold' } } }),
    });
    y = doc.lastAutoTable.finalY + 12;
  });
  if (blocks.length === 0) { doc.setFontSize(10); doc.text('No rows.', margin, y + 10); }
  return doc;
}

/** Saves the report as the chosen file type. format: 'pdf' | 'csv'. */
export async function downloadReport({ format = DEFAULT_FILE_TYPE, csvText, fileName, title = '', subtitle = '' }) {
  const name = fileNameFor(fileName, format);
  if (format !== 'pdf') {
    saveBlob(new Blob([csvText], { type: 'text/csv;charset=utf-8' }), name);
    return;
  }
  const doc = await buildPdf(csvText, { title, subtitle });
  saveBlob(doc.output('blob'), name);
}
