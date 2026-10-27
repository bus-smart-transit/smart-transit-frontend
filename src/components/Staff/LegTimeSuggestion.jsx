import { useState } from 'react';
import OperatorService from '../../api/StaffService/OperatorService';

/**
 * Batch 28 Stage 3, item 7: suggested leg start times for a new shift block. Leg 1 stays where the operator put it;
 * each later leg is suggested at the previous leg's expected end (the route's stop offsets x the factor of the window
 * the leg starts in) plus the turnaround buffer. A SUGGESTION: nothing changes until "Use these times" is pressed, the
 * operator can still edit every time, and times already issued or started are never touched. Everything shown comes
 * from the server.
 *
 * 2026-10-27 (§4.2): the server also decides HOW MANY legs fit from the route's travel time (no fixed number), says
 * where each travel time came from (a peak-hour time you set, measured trips, or the route estimate), and flags
 * overtime, the driving limit, a missing rest break and night work. "Use these times" sets that many legs.
 */
export default function LegTimeSuggestion({ fleetRouteId, date, firstTime, serviceType, onApply }) {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const ready = Boolean(fleetRouteId && date && firstTime);

  const suggest = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await OperatorService.planShiftBlockLegs({ fleet_route_id: fleetRouteId, scheduled_date: date, first_departure_time: firstTime, service_type: serviceType || 'regular' });
      setPlan(res?.data ?? null);
    } catch (err) {
      setPlan(null);
      setError(err?.message || 'Times could not be suggested.');
    } finally {
      setBusy(false);
    }
  };

  const usable = plan && plan.legs.length > 0
    && plan.legs.every((leg) => leg.suggested_departure && !leg.spills_into_next_day && leg.expected_duration_minutes !== null);
  const flags = Array.isArray(plan?.flags) ? plan.flags : [];

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600" data-testid="leg-time-suggestion">
      <div className="flex items-center justify-between gap-2">
        <span>Suggest how many legs fit and their times, from the route&apos;s travel time and a {plan?.buffer_minutes ?? ''} minute turnaround.</span>
        <button type="button" onClick={suggest} disabled={!ready || busy} className="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 disabled:opacity-50">
          {busy ? 'Working...' : 'Suggest times'}
        </button>
      </div>
      {!ready && <p className="mt-1 text-slate-500">Choose the fleet route, the date and the first departure first.</p>}
      {error && <p role="alert" className="mt-1 text-red-600">{error}</p>}
      {plan && (
        <>
          <ol className="mt-2 space-y-1" data-testid="suggested-legs">
            {plan.legs.map((leg) => (
              <li key={leg.leg_index}>
                Leg {leg.leg_index} ({leg.direction}): <strong className="text-slate-800">{leg.suggested_departure}</strong>
                {leg.expected_duration_minutes !== null && <> &rarr; ends about {leg.expected_end} ({leg.expected_duration_minutes} min{leg.factor_label ? `, factor x${leg.factor} ${leg.factor_label}` : ''}{leg.duration_source_label ? ` · ${leg.duration_source_label}` : ''})</>}
                {leg.expected_duration_minutes === null && <> (this route has no stop times, so the following legs cannot be suggested)</>}
                {leg.spills_into_next_day && <> (after midnight: choose it yourself)</>}
              </li>
            ))}
          </ol>
          {plan.summary?.expected_finish && (
            <p className="mt-1" data-testid="plan-summary">
              {plan.legs.length} legs, finishing about {plan.summary.expected_finish}.
            </p>
          )}
          {flags.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-amber-800" data-testid="plan-flags">
              {flags.map((flag) => <li key={flag.code}>{flag.message}</li>)}
            </ul>
          )}
          <p className="mt-1">{plan.note}</p>
          <button type="button" disabled={!usable} onClick={() => onApply(plan.legs.map((leg) => leg.suggested_departure))} className="mt-2 rounded-lg bg-teal-600 px-3 py-1.5 font-semibold text-white hover:bg-teal-500 disabled:opacity-50">
            Use these times
          </button>
          {!usable && <span className="ml-2 text-slate-500">Not every leg could be suggested, so edit the times yourself.</span>}
        </>
      )}
    </div>
  );
}
