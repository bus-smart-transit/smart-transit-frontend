import { useState } from 'react';
import { canMoveLeg, legTimeValue } from '../../../utils/legPlanning';

/**
 * 2026-10-27 (§4.2): the Operator moves a leg that has not started to a new time (traffic, a late bus). The server
 * checks the order, the turnaround, the bus and the passengers, tells the crew, and answers with the reason when it
 * refuses. Legs already boarding or under way are shown, not editable.
 */
export default function LegTimeEditor({ legs, onSave }) {
  const ordered = [...(Array.isArray(legs) ? legs : [])].sort((a, b) => String(a.departure_time).localeCompare(String(b.departure_time)));
  const [times, setTimes] = useState(() => Object.fromEntries(ordered.map((leg) => [leg.trip_id, legTimeValue(leg.departure_time)])));
  const [busyId, setBusyId] = useState(null);
  const [notes, setNotes] = useState({});

  if (ordered.length === 0) return null;

  const save = async (leg) => {
    setBusyId(leg.trip_id);
    setNotes((current) => ({ ...current, [leg.trip_id]: null }));
    const result = await onSave(leg.trip_id, times[leg.trip_id]);
    setNotes((current) => ({ ...current, [leg.trip_id]: result }));
    setBusyId(null);
  };

  return (
    <section aria-label="Change a leg time" className="space-y-2" data-testid="leg-time-editor">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Change a leg time</h3>
      <ul className="space-y-2">
        {ordered.map((leg, index) => {
          const editable = canMoveLeg(leg);
          const changed = times[leg.trip_id] !== legTimeValue(leg.departure_time);
          const note = notes[leg.trip_id];
          return (
            <li key={leg.trip_id} className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label htmlFor={`leg-time-${leg.trip_id}`} className="w-14 font-semibold text-slate-700">Leg {index + 1}</label>
                <input
                  id={`leg-time-${leg.trip_id}`}
                  type="time"
                  value={times[leg.trip_id] ?? ''}
                  disabled={!editable || busyId !== null}
                  onChange={(event) => setTimes((current) => ({ ...current, [leg.trip_id]: event.target.value }))}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                />
                {editable ? (
                  <button
                    type="button"
                    onClick={() => void save(leg)}
                    disabled={!changed || !times[leg.trip_id] || busyId !== null}
                    className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
                  >
                    {busyId === leg.trip_id ? 'Saving...' : 'Save time'}
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">Started, cannot be moved</span>
                )}
              </div>
              {note && <p role={note.ok ? 'status' : 'alert'} className={`text-xs ${note.ok ? 'text-teal-700' : 'text-red-700'}`}>{note.message}</p>}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-slate-500">The Driver and the Chauffeur are told. A leg with passengers can move later, not earlier.</p>
    </section>
  );
}
