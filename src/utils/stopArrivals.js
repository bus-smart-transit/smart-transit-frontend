// Batch 77 (user, 2026-11-17): words and colours for the "Next arrivals" card of a stop pin on Track Bus. The server's
// StopArrivalsService gives each bus's minutes, live flag and delay; this only chooses how to show them.

/** The ETA band of one arrival: Delayed, Arriving (5 min or less), Approaching (6 to 15), Expected later (16+). */
export function etaBand(arrival) {
  if (arrival?.delayed) return { key: 'delayed', label: 'Delayed', tone: 'bg-red-100 text-red-800' };
  const minutes = Number(arrival?.eta_minutes);
  if (!Number.isFinite(minutes)) return { key: 'unknown', label: 'Not provided', tone: 'bg-slate-100 text-slate-600' };
  if (minutes <= 5) return { key: 'arriving', label: 'Arriving', tone: 'bg-emerald-100 text-emerald-800' };
  if (minutes <= 15) return { key: 'approaching', label: 'Approaching', tone: 'bg-amber-100 text-amber-800' };
  return { key: 'later', label: 'Expected later', tone: 'bg-slate-100 text-slate-700' };
}

/** "3 min", or "Now" when the bus is at the stop. */
export function etaText(arrival) {
  const minutes = Number(arrival?.eta_minutes);
  if (!Number.isFinite(minutes)) return 'Not provided';
  return minutes <= 0 ? 'Now' : `${minutes} min`;
}

/** "{bus company} – {body no}", falling back to the server's bus label, then "Not provided". */
export function busLine(arrival) {
  const company = String(arrival?.bus_company || '').trim();
  const body = String(arrival?.body_no || '').trim();
  if (company && body) return `${company} – ${body}`;
  return company || body || String(arrival?.bus_label || '').trim() || 'Not provided';
}

/** "Last updated just now" / "Last updated 2 min ago", from the server's time of the answer. */
export function updatedText(updatedAt, now = Date.now()) {
  const at = Date.parse(updatedAt || '');
  if (!Number.isFinite(at)) return '';
  const minutes = Math.floor(Math.max(0, now - at) / 60000);
  return minutes < 1 ? 'Last updated just now' : `Last updated ${minutes} min ago`;
}
