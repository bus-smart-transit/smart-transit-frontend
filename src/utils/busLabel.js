// Passenger-facing bus label (Batch 28, item 2). The server builds
// "{bus_company_name} - {body_no}" from the fleet's current row and sends null when either
// part is missing. This helper only chooses the words for a missing label: it never falls
// back to the plate number, a fleet id or any other made-up value.
export const BUS_NOT_ASSIGNED = 'Bus not yet assigned';
export const BUS_UNAVAILABLE = 'Bus label unavailable';

export function busLabelText(label, { assigned = true } = {}) {
  if (!assigned) return BUS_NOT_ASSIGNED;
  const text = typeof label === 'string' ? label.trim() : '';
  return text || BUS_UNAVAILABLE;
}
