// Batch 80 (user, 2026-11-19): the printed ticket (Print PDF) in the designer's ticket design, shared by the booking page
// and My Tickets (they had two copies of the old green layout). Every value is escaped; the QR image is drawn locally.

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

/** "2026/11/19 - 2:00 PM" (the app's date-time label) as its date and its time; anything else stays whole as the time. */
export function splitDeparture(label) {
  const [date, time] = String(label || '').split(' - ');
  return time ? { date, time } : { date: null, time: label || null };
}

/** The pill in the header and the line at the foot, per ticket status (the same words as the ticket on screen). */
export const PRINT_STATUS = {
  valid: { pill: 'Valid', foot: 'Valid ticket. Show this QR code when boarding', style: 'border:1px solid #9dd7af;background:#eaf9f0;color:#166534;' },
  issued: { pill: 'Issued', foot: 'Ticket Issued — Ready for boarding', style: 'border:1px solid #9dd7af;background:#eaf9f0;color:#166534;' },
  boarded: { pill: 'Boarded', foot: 'Boarded — You are currently on this trip', style: 'border:1px solid #7dd3fc;background:#e0f2fe;color:#0369a1;' },
  alighted: { pill: 'Completed', foot: 'Trip Completed — Thank you for riding!', style: 'border:1px solid #94a3b8;background:#f1f5f9;color:#475569;' },
  expired: { pill: 'Expired', foot: 'This ticket has expired', style: 'border:1px solid #fca5a5;background:#fef2f2;color:#991b1b;' },
  missed: { pill: 'Missed', foot: 'Missed. The bus left your stop before this ticket was scanned.', style: 'border:1px solid #fca5a5;background:#fef2f2;color:#991b1b;' },
  cancelled: { pill: 'Cancelled', foot: 'Ticket Cancelled', style: 'border:1px solid #fca5a5;background:#fef2f2;color:#7f1d1d;' },
};

/** The rows under the strip: discount, priority seat and baggage, from a ticket as the server sends it. */
export function ticketExtraRows(ticket) {
  const rows = [];
  if (Number(ticket?.discount_amount) > 0) {
    rows.push({ label: 'Original fare', value: `PHP ${Number(ticket.original_amount).toFixed(2)}` });
    rows.push({ label: `${ticket.discount_label || 'Onsite'} discount`, value: `-PHP ${Number(ticket.discount_amount).toFixed(2)}` });
    if (ticket.discount_id_checked_at) rows.push({ label: 'ID check', value: 'Verified by Chauffeur' });
  }
  if (ticket?.priority_label) rows.push({ label: 'Priority seat', value: ticket.priority_label });
  if (ticket?.has_baggage) rows.push({ label: 'Baggage', value: 'In the compartment (in the fare)' });
  return rows;
}

/**
 * The whole printable page.
 * @param {{ title?: string, from?: string, to?: string, departure?: string, fare?: number|null, status?: string,
 *   ticketId?: string, traveller?: string, rows?: Array<{label: string, value: string}>, qrSrc?: string }} ticket
 */
export function ticketPrintHtml({ title = 'SmartTransit Ticket', from, to, departure, fare = null, status = 'valid', ticketId = '', traveller = '', rows = [], qrSrc = '' }) {
  const esc = escapeHtml;
  const state = PRINT_STATUS[String(status || 'valid').toLowerCase()] ?? PRINT_STATUS.issued;
  const { date, time } = splitDeparture(departure);
  const strip = [
    date && ['Date', date],
    ['Departure', time || 'Not provided'],
    fare != null && ['Fare', `PHP ${Number(fare).toFixed(2)}`],
  ].filter(Boolean);
  return `
      <html>
        <head>
          <title>${esc(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; background: #f1f5f9; }
            .ticket { max-width: 420px; margin: 0 auto; border-radius: 16px; overflow: hidden; background: #fff; border: 1px solid #d6e5ec; }
            .head { background: linear-gradient(90deg, #153a6b, #05588a); color: #fff; padding: 16px 20px; display: flex; justify-content: space-between; gap: 12px; }
            .head .brand { margin: 0; font-size: 16px; font-weight: 700; }
            .head .who { margin: 3px 0 0; font-size: 12px; opacity: 0.85; }
            .pill { align-self: flex-start; background: #bee8da; color: #0e2749; border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
            .body { padding: 20px 20px 12px; }
            .k { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
            .v { display: block; margin-top: 4px; font-size: 14px; font-weight: 700; color: #0e2749; }
            .route { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: center; }
            .route .to { text-align: right; }
            .arrow { color: #05588a; font-size: 18px; }
            .strip { margin-top: 18px; display: grid; grid-template-columns: repeat(${strip.length}, minmax(0, 1fr)); gap: 12px; background: #f1f5f9; border-radius: 12px; padding: 12px 16px; }
            .strip div:last-child { text-align: right; }
            .rows { margin-top: 10px; }
            .rows div { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px solid #ebeff5; padding: 6px 0; font-size: 13px; }
            .rows div span:first-child { color: #64748b; }
            .rows div span:last-child { font-weight: 700; }
            .tear { position: relative; height: 24px; }
            .tear::before, .tear::after { content: ''; position: absolute; top: 0; width: 24px; height: 24px; border-radius: 50%; background: #f1f5f9; }
            .tear::before { left: -12px; } .tear::after { right: -12px; }
            .tear span { position: absolute; left: 20px; right: 20px; top: 50%; border-top: 2px dashed #d6e5ec; }
            .foot-area { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 8px 20px 16px; }
            .id { font-family: 'Courier New', monospace; letter-spacing: 0.15em; }
            .hint { margin-top: 10px; font-size: 12px; color: #64748b; }
            .qr { width: 160px; height: 160px; border: 1px solid #d6e5ec; border-radius: 12px; display: grid; place-items: center; background: #fff; flex-shrink: 0; }
            .qr img { width: 148px; height: 148px; object-fit: contain; }
            .foot { margin: 0 20px 20px; border-radius: 10px; padding: 9px 10px; font-size: 12px; text-align: center; font-weight: 700; }
          </style>
        </head>
        <body>
          <article class="ticket">
            <header class="head">
              <div>
                <p class="brand">SmartTransit</p>
                ${traveller ? `<p class="who">Passenger: ${esc(traveller)}</p>` : ''}
              </div>
              <span class="pill">${esc(state.pill)}</span>
            </header>
            <div class="body">
              <div class="route">
                <div><span class="k">From</span><span class="v">${esc(from || '-')}</span></div>
                <div class="arrow">&rarr;</div>
                <div class="to"><span class="k">To</span><span class="v">${esc(to || '-')}</span></div>
              </div>
              <div class="strip">
                ${strip.map(([k, v]) => `<div><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`).join('')}
              </div>
              ${rows.length ? `<div class="rows">${rows.map((row) => `<div><span>${esc(row.label)}</span><span>${esc(row.value)}</span></div>`).join('')}</div>` : ''}
            </div>
            <div class="tear"><span></span></div>
            <div class="foot-area">
              <div>
                ${ticketId ? `<span class="k">Ticket ID</span><span class="v id">${esc(ticketId)}</span>` : ''}
                <p class="hint">Show this QR code to the Chauffeur when boarding.</p>
              </div>
              <div class="qr">${qrSrc ? `<img src="${esc(qrSrc)}" alt="Ticket QR" />` : '<span>QR unavailable</span>'}</div>
            </div>
            <div class="foot" style="${state.style}">${esc(state.foot)}</div>
          </article>
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `;
}
