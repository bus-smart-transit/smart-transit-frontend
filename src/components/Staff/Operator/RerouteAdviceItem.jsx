import { useState } from 'react';
import { OpChip } from './OperatorUI';
import { formatManilaDateTime } from '../../../utils/dates';

const PRIORITY_TONE = { high: 'danger', medium: 'warning', low: 'info' };

/**
 * One piece of trip-specific operational advice. Every choice is audit logged; only "Contact crew" sends a message,
 * and no choice assigns a bus or changes a route.
 */
export default function RerouteAdviceItem({ item, saving, onDecide }) {
  const [note, setNote] = useState('');

  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <OpChip tone={PRIORITY_TONE[item.priority]}>{item.priority === 'high' ? 'High priority' : 'Review'}</OpChip>
        <span className="text-sm font-semibold text-slate-900">{item.route}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{item.text}</p>
      <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
        <p>Trip status: <span className="font-semibold capitalize">{item.tripStatus}</span></p>
        <p>GPS: <span className="font-semibold">{item.gpsLabel}</span>{item.gpsRecordedAt ? `, ${formatManilaDateTime(item.gpsRecordedAt)}` : ', no report time available'}</p>
      </div>
      {item.decisionLabel ? (
        <p className="mt-2 text-xs font-semibold text-emerald-700">
          Recorded: {item.decisionLabel}{item.decidedAt ? ` (${formatManilaDateTime(item.decidedAt)})` : ''}
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-semibold text-slate-600" htmlFor={`dispatch-note-${item.tripId}`}>
            Operator note or crew message
          </label>
          <textarea
            id={`dispatch-note-${item.tripId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Add context. A message is required to contact the crew."
            className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving === item.tripId}
              onClick={() => onDecide(item, 'accept', note)}
              className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-60"
            >
              {saving === item.tripId ? 'Saving...' : 'Acknowledge advice'}
            </button>
            <button
              type="button"
              disabled={saving === item.tripId}
              onClick={() => onDecide(item, 'keep', note)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Keep current route
            </button>
            <button
              type="button"
              disabled={saving === item.tripId || !item.hasAssignedCrew || !note.trim()}
              onClick={() => onDecide(item, 'contact', note.trim())}
              className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-50"
              title={!item.hasAssignedCrew ? 'Assign a driver or chauffeur before contacting crew.' : undefined}
            >
              Contact crew
            </button>
          </div>
          {!item.hasAssignedCrew && <p className="text-xs text-amber-700">No assigned crew can receive a message for this trip.</p>}
        </div>
      )}
    </li>
  );
}
