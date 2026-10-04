// Batch 28 Stage 3, item 6: wording for a cancelled-trip ticket. Statuses and amounts are the server's; this only
// words them. Statuses: trip_cancelled (awaiting the passenger's choice), rebooked, refund_pending, refund_review, refunded.

export const CANCELLED_TRIP_STATUSES = ['trip_cancelled', 'refund_pending', 'refund_review', 'refunded', 'rebooked'];

export const TICKET_STATUS_LABELS = {
  trip_cancelled: 'Trip cancelled - choose',
  refund_pending: 'Refund pending',
  refund_review: 'Refund under review',
  refunded: 'Refunded',
  rebooked: 'Rebooked',
};

export const ticketStatusLabel = (status) => TICKET_STATUS_LABELS[String(status ?? '').toLowerCase()] ?? status;

/** Where the money goes, for the refund choice. */
export function refundMethodText(method) {
  if (method === 'cash') return 'Paid in cash: the refund is handed back at the terminal and recorded by the operator.';
  return 'Refunded to the GCash, Maya or card you paid with. It can take a day or more to show.';
}

/** One sentence for a ticket that has already been settled, or '' when nothing was chosen yet. */
export function resolutionSummary(resolution) {
  if (!resolution) return '';
  const amount = resolution.amount !== null && resolution.amount !== undefined ? `PHP ${Number(resolution.amount).toFixed(2)}` : null;
  if (resolution.resolution === 'rebook') return 'You rebooked this ticket. Your new ticket is in My Tickets.';
  if (resolution.status === 'needs_review') return 'Your refund request was received. The operator is confirming the amount.';
  if (resolution.status === 'failed') return 'The refund could not be sent yet. The operator has been asked to retry it.';
  if (resolution.status === 'succeeded') {
    return amount && Number(resolution.amount) > 0
      ? `Refunded: ${amount} ${resolution.method === 'cash' ? 'in cash at the terminal' : 'to your original payment method'}.`
      : 'Nothing to refund: the part you already travelled covers the whole fare.';
  }
  if (resolution.waiting_until) return `Your refund of ${amount} is scheduled: the payment provider takes it from the next day.`;
  return `Your refund of ${amount ?? 'the ticket fare'} is being processed${resolution.method === 'cash' ? ' by the operator' : ''}.`;
}
