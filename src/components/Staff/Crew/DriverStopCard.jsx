import { CheckCircle2, MapPin } from 'lucide-react';
import RequestedStopRow from '../RequestedStopRow';
import { driverStopFocus, stopLabel } from '../../../utils/driverStopFocus';

const BUTTON = 'flex min-h-16 w-full items-center justify-center rounded-2xl px-5 text-xl font-bold text-white shadow transition disabled:cursor-not-allowed disabled:opacity-50';

/**
 * 2026-11-13 (user): the Driver's route details as ONE stop at a time, with its one button, so the Driver does not
 * scroll while driving. The starting terminal holds Start boarding and Depart (from `step`, utils/crewNextStep.js),
 * each later stop holds Acknowledge, and the last stop holds End Trip once it is reached. The full list stays
 * available, closed, under "All stops", for when the bus is parked.
 */
export default function DriverStopCard({
  stops = [],
  tripStatus = '',
  step = null,
  reason = '',
  requestedGroups = { before: [], after: {}, unknown: [] },
  isPaired = false,
  inFlight = false,
  onStep,
  onAcknowledge,
  onEndTrip,
}) {
  const focus = driverStopFocus({ stops, tripStatus });
  if (focus.phase === 'none' || !focus.stop) {
    return (
      <section className="staff-card" aria-label="Route details">
        <h4 className="text-base font-bold text-slate-900">Route details</h4>
        <p className="mt-2 text-sm text-slate-500">{stops.length === 0 ? 'No route details available.' : 'This trip is finished.'}</p>
      </section>
    );
  }

  const { phase, index, stop, total, previousSeq, following } = focus;
  const name = stopLabel(stop, index);
  const reached = stops.filter((s) => s?.is_acknowledged).length;
  const percent = total > 0 ? Math.round((reached / total) * 100) : 0;
  // Passengers' requested drop-offs on the way to this stop (after the stop before it).
  const onTheWay = phase === 'start'
    ? requestedGroups.before ?? []
    : (previousSeq != null ? requestedGroups.after?.[previousSeq] ?? [] : []);
  const startStep = phase === 'start' && step && ['boarding', 'depart'].includes(step.key) ? step : null;

  let heading = 'Next stop';
  if (phase === 'start') heading = 'Starting terminal';
  if (phase === 'end') heading = 'Last stop reached';

  return (
    <section className="rounded-2xl border-2 border-teal-200 bg-white p-5 shadow-sm" aria-label="Route details" data-testid="driver-stop-card" data-phase={phase}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">{heading}</p>
        <p className="font-data text-sm font-semibold text-slate-600" data-testid="driver-stop-count">Stop {index + 1} of {total}</p>
      </div>
      <h3 className="mt-1 flex items-start gap-2 text-2xl font-bold leading-tight text-slate-900">
        {phase === 'end' ? <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" /> : <MapPin className="mt-1 h-6 w-6 shrink-0 text-teal-600" aria-hidden="true" />}
        <span className="min-w-0 wrap-break-word">{name}</span>
      </h3>
      {stop.distance_from_origin_km != null && <p className="mt-1 font-data text-sm text-slate-500">{stop.distance_from_origin_km} km from the start</p>}

      {onTheWay.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {onTheWay.map((requested) => (
            <RequestedStopRow key={`${requested.latitude},${requested.longitude}`} requested={requested} note="on the way here" />
          ))}
        </div>
      )}

      <div className="mt-4">
        {phase === 'start' && startStep && (
          <button type="button" className={`${BUTTON} bg-teal-600 hover:bg-teal-700`} onClick={() => onStep?.(startStep.key)} disabled={startStep.disabled}>
            {startStep.label}
          </button>
        )}
        {phase === 'onRoad' && (
          <button
            type="button"
            className={`${BUTTON} bg-sky-600 hover:bg-sky-700`}
            onClick={() => onAcknowledge?.(stop.stop_id)}
            disabled={inFlight || !isPaired || !stop.stop_id}
            title={!isPaired ? 'Pairing is required to acknowledge stops.' : undefined}
          >
            Acknowledge
          </button>
        )}
        {phase === 'end' && (
          <button type="button" className={`${BUTTON} bg-rose-600 hover:bg-rose-700`} onClick={() => onEndTrip?.()} disabled={inFlight || !isPaired}>
            End Trip
          </button>
        )}
      </div>
      {(startStep?.reason || reason) && (
        <p role="status" data-testid="trip-action-reason" className="mt-3 text-base font-semibold text-amber-800">{startStep?.reason || reason}</p>
      )}

      {following && phase !== 'end' && (
        <p className="mt-3 text-sm text-slate-600">After this: <span className="font-semibold text-slate-800">{stopLabel(following, index + 1)}</span></p>
      )}

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600">Stops reached</span>
          <span className="font-data font-bold text-slate-900">{reached} of {total}</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" data-testid="driver-all-stops">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">All stops ({total})</summary>
        <ol className="mt-2 space-y-1.5">
          {(requestedGroups.before ?? []).map((requested) => (
            <li key={`before-${requested.latitude},${requested.longitude}`}><RequestedStopRow requested={requested} note="before the first stop" /></li>
          ))}
          {stops.map((s, i) => {
            const done = Boolean(s?.is_acknowledged);
            const seq = s?.sequence_number ?? s?.stop_order ?? i + 1;
            return (
              <li key={s?.stop_id ?? i} className="space-y-1.5">
                <div className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm ${i === index ? 'bg-teal-50 font-semibold text-teal-900' : done ? 'text-emerald-700' : 'text-slate-700'}`}>
                  <span className="font-data w-6 shrink-0 text-right text-xs text-slate-500">{i + 1}</span>
                  <span className="min-w-0 flex-1 wrap-break-word">{stopLabel(s, i)}</span>
                  {done && <span className="text-xs font-semibold text-emerald-700">Reached</span>}
                </div>
                {(requestedGroups.after?.[seq] ?? []).map((requested) => (
                  <RequestedStopRow key={`${requested.latitude},${requested.longitude}`} requested={requested} />
                ))}
              </li>
            );
          })}
          {(requestedGroups.unknown ?? []).map((requested) => (
            <li key={`unknown-${requested.latitude},${requested.longitude}`}><RequestedStopRow requested={requested} note="position on the route unknown" /></li>
          ))}
        </ol>
      </details>
    </section>
  );
}
