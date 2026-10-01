import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Navigation, Search, Ticket } from 'lucide-react'
import TrackHeader from './TrackHeader'
import Button from '../../ui/Button'
import PassengerService from '../../../api/PassengerService/PassengerService'
import { extractTrackingToken } from '../../../utils/trackingToken'
import { formatManilaDate } from '../../../utils/dates'

const TRACKABLE = ['valid', 'boarded']

const stopName = (ticket, side) => (side === 'from'
  ? ticket?.origin_stop?.stop_name || ticket?.origin || 'Origin'
  : ticket?.destination_label || ticket?.destination_stop?.stop_name || ticket?.destination || 'Destination')

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate-400 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30'

/**
 * /track: where "Track a Bus" leads. A guest or a signed-in passenger identifies their bus with the
 * tracking code or link from their ticket (opens /track/<token>). Someone who lost it can look their
 * ticket up again with the payment reference (and the email used, if any) to get the link back.
 */
export default function TrackLookupPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [form, setForm] = useState({ reference: '', email: '' })
  const [lookup, setLookup] = useState({ status: 'idle', tickets: [], error: '' })

  const submitCode = (event) => {
    event.preventDefault()
    const token = extractTrackingToken(code)
    if (!token) {
      setCodeError('That does not look like a tracking code. Copy the whole link or code from your ticket.')
      return
    }
    navigate(`/track/${token}`)
  }

  const submitLookup = async (event) => {
    event.preventDefault()
    const reference = form.reference.trim()
    if (!reference) {
      setLookup({ status: 'error', tickets: [], error: 'Enter the payment reference from your receipt.' })
      return
    }
    setLookup({ status: 'loading', tickets: [], error: '' })
    try {
      const params = { transaction_reference: reference }
      if (form.email.trim()) params.email = form.email.trim()
      const res = await PassengerService.guestLookupTicket(params)
      setLookup({ status: 'done', tickets: Array.isArray(res?.data) ? res.data : [], error: '' })
    } catch (err) {
      const status = err?.cause?.response?.status ?? err?.response?.status
      const error = status === 404
        ? 'No tickets found for that reference. If you paid with an email, enter it too.'
        : status === 429
          ? 'Too many tries. Please wait a few minutes.'
          : 'We could not look that up right now. Please try again.'
      setLookup({ status: 'error', tickets: [], error })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TrackHeader title="Track a bus" />

      <main className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
        <section aria-labelledby="track-code-heading" className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200 sm:p-6">
          <h2 id="track-code-heading" className="font-display text-xl font-bold text-navy-950">Where is my bus?</h2>
          <p className="mt-1 text-sm text-slate-600">Enter the tracking code or paste the tracking link from your ticket. It works for guest tickets and for tickets in your account.</p>

          <form onSubmit={submitCode} className="mt-4 space-y-3" noValidate>
            <div>
              <label htmlFor="track-code" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tracking code or link</label>
              <input
                id="track-code"
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value); setCodeError('') }}
                placeholder="Paste your tracking link or code"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(codeError)}
                aria-describedby={codeError ? 'track-code-error' : undefined}
                className={inputClass}
              />
              {codeError && <p id="track-code-error" role="alert" className="mt-1.5 text-sm text-red-600">{codeError}</p>}
            </div>
            <Button type="submit" variant="primary" size="lg" icon={Navigation} className="w-full sm:w-auto">Track my bus</Button>
          </form>

          <p className="mt-4 text-xs text-slate-500">
            Signed in? Your tickets already have a "Track this bus" button:{' '}
            <Link to="/passenger/dashboard?tab=tickets" className="font-semibold text-navy-800 underline">open My Tickets</Link>.
          </p>
        </section>

        <section aria-labelledby="track-lookup-heading" className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200 sm:p-6">
          <h2 id="track-lookup-heading" className="font-display text-lg font-bold text-navy-950">Lost your link?</h2>
          <p className="mt-1 text-sm text-slate-600">Find your ticket again with the payment reference on your receipt, and the email you used if you gave one.</p>

          <form onSubmit={submitLookup} className="mt-4 grid gap-3 sm:grid-cols-2" noValidate>
            <div>
              <label htmlFor="track-reference" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Payment reference</label>
              <input id="track-reference" type="text" value={form.reference} onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))} placeholder="TXN-..." autoComplete="off" className={inputClass} />
            </div>
            <div>
              <label htmlFor="track-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email (if you used one)</label>
              <input id="track-email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="you@example.com" autoComplete="email" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="outline" size="md" icon={Search} loading={lookup.status === 'loading'}>Find my ticket</Button>
            </div>
          </form>

          {lookup.status === 'error' && <p role="alert" className="mt-3 text-sm text-red-600">{lookup.error}</p>}

          {lookup.status === 'done' && (
            <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200" aria-label="Your tickets">
              {lookup.tickets.map((ticket) => {
                const canTrack = Boolean(ticket.tracking_token) && TRACKABLE.includes(String(ticket.status).toLowerCase())
                return (
                  <li key={ticket.ticket_uuid || ticket.ticket_id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-navy-950"><Ticket size={14} aria-hidden="true" />{stopName(ticket, 'from')} &rarr; {stopName(ticket, 'to')}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {ticket.trip?.trip_date ? formatManilaDate(ticket.trip.trip_date) : ''} &middot; {String(ticket.status || '').toLowerCase()}
                      </p>
                    </div>
                    {canTrack
                      ? <Link to={`/track/${ticket.tracking_token}`} className="rounded-full bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900">Track this bus</Link>
                      : <span className="text-xs text-slate-500">Tracking is not available for this ticket</span>}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
