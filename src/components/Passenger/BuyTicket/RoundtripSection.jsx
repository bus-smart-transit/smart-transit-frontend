import { CalendarDays, Clock3, Loader, Repeat } from 'lucide-react'
import { formatManilaDate } from '../../../utils/dates'
import { legBusText } from '../../../utils/roundtrip'

const LABEL = 'text-sm font-semibold text-navy-950'
const FIELD = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-navy-950 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20'

function Pill({ checked, onChange, label }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${checked ? 'border-navy-700 bg-navy-50 text-navy-900' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}>
      <input type="radio" name="journey_type" checked={checked} onChange={onChange} className="h-4 w-4 accent-navy-800" />
      {label}
    </label>
  )
}

function LegCard({ title, leg, quantity }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3.5" data-testid={`roundtrip-${leg.journey_leg}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-1 text-sm font-bold text-navy-950">{leg.origin?.name} <span className="text-slate-400" aria-hidden="true">&rarr;</span> {leg.destination?.name}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-500">
        <div><dt className="inline">Date: </dt><dd className="inline font-semibold text-navy-950">{formatManilaDate(leg.trip_date)}</dd></div>
        <div><dt className="inline">Boards: </dt><dd className="inline font-semibold text-navy-950">{leg.boarding_time}</dd></div>
        <div><dt className="inline">Bus: </dt><dd className="inline font-semibold text-navy-950">{legBusText(leg)}</dd></div>
        <div><dt className="inline">Fare: </dt><dd className="inline font-semibold text-navy-950">{leg.fare === null ? 'Fare unavailable' : `PHP ${Number(leg.fare).toFixed(2)}${quantity > 1 ? ` x ${quantity}` : ''}`}</dd></div>
      </dl>
    </div>
  )
}

/**
 * Trip type (One-way / Roundtrip), the return date and time, and the server's confirmation of both legs with
 * the no-cancellation rule, shown before anything is paid. All values come from the server's answer.
 */
export default function RoundtripSection({ roundtrip, outboundDate, today, lastBookableDate = null, quantity = 1 }) {
  const { active, setActive, returnDate, setReturnDate, returnTime, setReturnTime, fieldErrors, loading, data, error, canPay, blockedReason } = roundtrip

  return (
    <div className="mt-5 border-t border-slate-100 pt-5" data-testid="roundtrip-section">
      <fieldset>
        <legend className={LABEL}>Trip Type</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          <Pill checked={!active} onChange={() => setActive(false)} label="One-way" />
          <Pill checked={active} onChange={() => setActive(true)} label="Roundtrip" />
        </div>
      </fieldset>

      {active && (
        <div className="mt-4 space-y-4">
          <p className="flex items-center gap-2 text-sm text-slate-500"><Repeat size={14} aria-hidden="true" /> One booking and one payment make two tickets: your outbound trip and your return trip.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-navy-950">
              <span className="flex items-center gap-1.5"><CalendarDays size={14} aria-hidden="true" /> Return date</span>
              <input type="date" value={returnDate} min={outboundDate || today || undefined} max={lastBookableDate || undefined} onChange={(e) => setReturnDate(e.target.value)} className={FIELD} aria-invalid={Boolean(fieldErrors.returnDate)} />
              {fieldErrors.returnDate && <span role="alert" className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.returnDate}</span>}
            </label>
            <label className="block text-sm font-semibold text-navy-950">
              <span className="flex items-center gap-1.5"><Clock3 size={14} aria-hidden="true" /> Return time (Manila)</span>
              <input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className={FIELD} aria-invalid={Boolean(fieldErrors.returnTime)} />
              {fieldErrors.returnTime && <span role="alert" className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.returnTime}</span>}
            </label>
          </div>

          <div aria-live="polite" className="space-y-3">
            {loading && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader size={16} className="animate-spin" /> Checking both trips...</div>}
            {!loading && error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            {!loading && data && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.outbound ? <LegCard title="Outbound ticket" leg={data.outbound} quantity={quantity} /> : null}
                  {data.return ? <LegCard title="Return ticket" leg={data.return} quantity={quantity} /> : null}
                </div>
                {!canPay && blockedReason && (
                  <p role="status" data-testid="roundtrip-blocked" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
                    {blockedReason} Nothing has been charged. Change the date or time to try again.
                  </p>
                )}
                <p data-testid="roundtrip-notice" className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">{data.cancellation_notice}</p>
              </>
            )}

            {!loading && !data && active && blockedReason && !error && (
              <p role="status" className="text-sm text-amber-700">{blockedReason}</p>
            )}
            {!loading && !data && !error && !blockedReason && (
              <p className="text-sm text-slate-500">Choose your return date and time to see both tickets.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
