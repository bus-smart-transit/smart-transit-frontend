const resolveStopName = (ticket, stopId, stopLookup, key) => {
  const stopObj = ticket?.[key];
  if (typeof stopObj === 'string') return stopObj;
  if (stopObj?.stop_name) return stopObj.stop_name;

  const routeStop = stopLookup.get(String(stopId));
  return routeStop?.stop?.stop_name || routeStop?.stop_name || `Stop ${stopId || '-'}`;
};

export default function useOnsiteReceiptPrinter() {
  const printOnsiteReceipt = ({ receipt, routeStops }) => {
    if (!receipt || !Array.isArray(receipt.tickets) || receipt.tickets.length === 0) {
      return false;
    }

    const popup = window.open('', '_blank', 'width=980,height=720');
    if (!popup) return false;

    const stopLookup = new Map((routeStops || []).map((stop) => [String(stop.stop_id), stop]));
    const payment = receipt.payment || {};

    const rows = receipt.tickets
      .map((ticket, index) => {
        const originStop = resolveStopName(ticket, ticket?.origin_stop_id, stopLookup, 'origin_stop');
        const destinationStop = resolveStopName(ticket, ticket?.destination_stop_id, stopLookup, 'destination_stop');

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${ticket.ticket_uuid || '-'}</td>
            <td style="text-transform: capitalize;">${ticket.seat_type || '-'}</td>
            <td>${originStop}</td>
            <td>${destinationStop}</td>
            <td>PHP ${Number(ticket.amount || 0).toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');

    popup.document.write(`
      <html>
        <head>
          <title>Onsite Checkout Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            p { margin: 0; }
            .muted { color: #475569; font-size: 12px; }
            .meta { margin-top: 14px; margin-bottom: 18px; display: grid; gap: 6px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #f1f5f9; }
            .footer { margin-top: 14px; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Smart Transit Onsite Checkout Receipt</h1>
          <p class="muted">Printed: ${new Date().toLocaleString()}</p>
          <div class="meta">
            <p><strong>Transaction Ref:</strong> ${payment.transaction_reference || '-'}</p>
            <p><strong>Payment ID:</strong> ${payment.payment_id || '-'}</p>
            <p><strong>Recorded At:</strong> ${receipt.createdAtLabel || '-'}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Ticket UUID</th>
                <th>Seat</th>
                <th>Origin</th>
                <th>Destination</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="footer">Total: PHP ${Number(payment.amount || 0).toFixed(2)}</div>
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);

    popup.document.close();
    return true;
  };

  return { printOnsiteReceipt };
}
