// Batch 28 Stage 3, item 6: which action the staff queue offers for a ticket of a cancelled trip. The server decides
// whether an action is allowed and what it pays; this only chooses which buttons to show.

/**
 * @param {{status: string, method: string, resolution: null | {resolution: string, status: string, method: string}}} row  a queue row
 * @returns {string[]} any of: 'rebook', 'refund' (settle for the passenger), 'review' (set a refund the server could
 *   not price), 'cash' (record the cash handed back), 'retry' (send a failed gateway refund again)
 */
export function queueActions(row) {
  const resolution = row?.resolution ?? null;
  if (!resolution) return row?.status === 'trip_cancelled' ? ['rebook', 'refund'] : [];
  if (resolution.status === 'needs_review') return ['review'];
  if (resolution.resolution === 'refund' && resolution.method === 'cash' && resolution.status === 'pending') return ['cash'];
  if (resolution.resolution === 'refund' && resolution.method === 'gateway' && resolution.status === 'failed') return ['retry'];
  return [];
}

/** One line for the "state" column of the queue. */
export function queueStateText(row) {
  const resolution = row?.resolution ?? null;
  if (!resolution) return 'Waiting for the passenger to choose';
  if (resolution.status === 'needs_review') return 'Travelled part could not be priced: needs your review';
  if (resolution.resolution === 'rebook') return 'Rebooked';
  if (resolution.status === 'failed') return `Refund failed${resolution.failure_reason ? `: ${resolution.failure_reason}` : ''}`;
  if (resolution.status === 'succeeded') return 'Refunded';
  if (resolution.method === 'cash') return 'Cash refund waiting to be handed over';
  return resolution.waiting_until ? 'Refund scheduled with the payment provider' : 'Refund sent, waiting for the payment provider';
}
