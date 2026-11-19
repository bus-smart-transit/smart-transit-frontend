// Batch 75 (user, 2026-11-15): the online transaction fee shown before paying. It mirrors App\Support\BookingFee on the
// server (which decides what is charged): PayMongo's rate for the chosen e-wallet, VAT included, on the fares of the
// payment (never under PHP 1, as PayMongo needs), once per payment, rounded to the centavo.

/** The fee in pesos, or null while the rates are not known (the page then says so instead of guessing). */
export function transactionFee(ratesPercent, channel, fares) {
  if (!ratesPercent || typeof ratesPercent !== 'object') return null;
  const rate = Number(ratesPercent[String(channel || '').toLowerCase()]);
  if (!Number.isFinite(rate)) return null;
  const base = Math.max(1, Number(fares) || 0);
  return Math.round((base * rate) + 1e-7) / 100;
}

/** "2.50%" for a rate in percent, or '' when it is unknown. */
export const ratePercentLabel = (ratesPercent, channel) => {
  const rate = Number(ratesPercent?.[String(channel || '').toLowerCase()]);
  return Number.isFinite(rate) ? `${rate.toFixed(2)}%` : '';
};
