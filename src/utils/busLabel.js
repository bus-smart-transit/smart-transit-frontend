// Passenger-facing bus label (Batch 28, item 2). The server builds
// "{bus company} / {body no}" (Batch 62; the owning company's name when the bus has none) and sends null when the
// body number is missing. This helper only chooses the words for a missing label: it never falls
// back to the plate number, a fleet id or any other made-up value.
export const BUS_NOT_ASSIGNED = 'Bus not yet assigned';
export const BUS_UNAVAILABLE = 'Not provided'; // Batch 62: the project's words for a missing value

export function busLabelText(label, { assigned = true } = {}) {
  if (!assigned) return BUS_NOT_ASSIGNED;
  const text = typeof label === 'string' ? label.trim() : '';
  return text || BUS_UNAVAILABLE;
}
