/** One requested stop (a passenger's custom drop-off) in the Driver's route details. */
export default function RequestedStopRow({ requested, note = '' }) {
  return (
    <div className="ml-9 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <span className="font-semibold">Requested stop:</span> {requested.label}{requested.kind && <span className="ml-1 rounded-full bg-amber-200 px-1.5 py-0.5 text-[0.65rem] font-semibold capitalize text-amber-900">{requested.kind}</span>}
      <span className="ml-2 text-amber-700">
        {requested.passenger_count} passenger{requested.passenger_count === 1 ? '' : 's'}
      </span>
      {note && <span className="ml-2 italic text-amber-700">{note}</span>}
    </div>
  )
}
