// 2026-11-26 (user): the scan pop-up's baggage wording and the row the Baggage pop-up expects (pure, unit-tested).

export const peso = (value) => `₱${Number(value || 0).toFixed(2)}`;
export const pieces = (row) => (Number(row?.baggage_count) > 0 ? Number(row.baggage_count) : row?.has_baggage ? 1 : 0);

/** 2026-11-26 (user): the baggage line for one passenger: pieces, and whether it is paid or still to collect. */
export function baggageLine(row) {
  const count = pieces(row);
  const paid = Number(row?.baggage_paid) || 0;
  if (count === 0 && paid === 0) return 'None';
  const label = `${Math.max(count, 1)}x baggage`;
  return paid > 0 ? `${label}, paid ${peso(paid)}` : `${label}, collect on board`;
}

/** True when the passenger declared baggage and nothing has been paid for it yet. */
export const baggageToCollect = (row) => pieces(row) > 0 && !(Number(row?.baggage_paid) > 0);

/** The row the Baggage pop-up expects (the same shape as the passenger list). */
export const baggageTarget = (row) => ({
  ticket_id: row.ticket_id,
  passenger_name: row.passenger_name,
  origin_stop: row.origin ?? null,
  baggage: Boolean(row.has_baggage),
  baggage_charges: Array.isArray(row.baggage_charges) ? row.baggage_charges : [],
});
