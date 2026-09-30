// Shared "Print / Save PDF" window for Operator reports (Fleet Reports and the
// Historical Forecast). Every value is HTML-escaped before it goes into the
// document, since report cells come from server data and user-entered text.

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

/**
 * @param {{ title: string, meta: Array<[string, string]>, columns: string[], rows: Array<Record<string, unknown>>, format?: (value: unknown) => string }} report
 * @returns {boolean} false when the browser blocked the pop-up.
 */
export function openPrintReport({ title, meta = [], columns, rows, format = (value) => String(value ?? '-') }) {
  const popup = window.open('', '_blank', 'width=1200,height=780')
  if (!popup) return false

  const head = columns.map((column) => `<th>${escapeHtml(column.replace(/_/g, ' '))}</th>`).join('')
  const body = rows
    .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(format(row?.[column]) || '-')}</td>`).join('')}</tr>`)
    .join('')
  const metaHtml = [...meta, ['Generated', new Date().toLocaleString()]]
    .map(([label, value]) => `<div><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`)
    .join('')

  popup.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: Poppins, system-ui, sans-serif; color: #101418; margin: 0; }
          .page { padding: 8px; }
          h1 { margin: 0; font-size: 1rem; }
          .meta { margin-top: 8px; color: #153a6b; font-size: 0.875rem; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 0.875rem; }
          th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; }
          th { background: #e2e8f0; text-transform: uppercase; font-size: 0.875rem; letter-spacing: 0.04em; }
          tr:nth-child(even) td { background: #f1f5f9; }
          .footer { margin-top: 10px; font-size: 0.875rem; color: #153a6b; }
        </style>
      </head>
      <body>
        <div class="page">
          <h1>Smart Transit Fleet Report</h1>
          <div class="meta">${metaHtml}</div>
          <table>
            <thead><tr>${head}</tr></thead>
            <tbody>${body}</tbody>
          </table>
          <p class="footer">Generated from Operator Dashboard Reports. This print view is PDF-ready via browser print dialog.</p>
        </div>
        <script>window.onload = function () { window.print(); };</script>
      </body>
    </html>
  `)
  popup.document.close()
  return true
}
