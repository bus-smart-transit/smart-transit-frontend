import { KeyRound, Link2 } from 'lucide-react';

/**
 * Batch 45 Feature B: the Dashboard card that opens the "Pair with crew" pop-up (pairing and the Daily PIN check),
 * which replaced the Daily PIN tab. Shared by the Driver and Chauffeur dashboards.
 *
 *   paired    true once this crew member is paired for today's trip
 *   reason    why pairing is not possible yet, or what to do next (from the pairing status)
 *   partner   'Chauffeur' for the Driver, 'Driver' for the Chauffeur
 *   onOpen    opens the pop-up
 */
export default function PairWithCrewCard({ paired, reason = '', partner, onOpen }) {
  return (
    <section
      className={`mb-4 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${paired ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}
      data-testid="pair-with-crew-card"
    >
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${paired ? 'text-emerald-800' : 'text-amber-800'}`}>
          {paired ? `Paired with your ${partner}` : `Not paired with your ${partner} yet`}
        </p>
        <p className={`mt-1 text-xs ${paired ? 'text-emerald-700' : 'text-amber-700'}`}>
          {paired
            ? 'Open it to show or check the Daily PIN for this trip.'
            : `${reason ? `${reason} ` : ''}Your route, schedule and bus stay visible; trip actions unlock once you are paired.`}
        </p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition focus:outline-none focus-visible:ring-2 ${paired ? 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500' : 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500'}`}
      >
        {paired ? <KeyRound size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
        {paired ? 'Show Daily PIN' : 'Pair with crew'}
      </button>
    </section>
  );
}
