import { ratePercent } from '../../../utils/discountClaim';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Armchair, ArrowRight, Bus, CalendarDays, CheckCircle, Clock3, CreditCard, Loader, Mail, Map as MapIcon, MapPin, Minus, Pencil, Plus } from 'lucide-react';
import useBuyTicket from '../../../api/hooks/Passenger/useBuyTicket';
import { busLabelText } from '../../../utils/busLabel';
import { sameTripGroup } from '../../../utils/tripGroups';
import TicketCard from '../Ticket/TicketCard';
import { ticketIdOf } from '../../../utils/ticketId';
import QrImage from '../Ticket/QrImage';
import TripTimeline from '../Timeline/TripTimeline';
import JourneyFields from './JourneyFields';
import SaveQrButton from '../Ticket/SaveQrButton';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Toggle from '../../ui/Toggle';
import Modal from '../../ui/Modal';
import RouteMap from '../../Map/RouteMap';
import { formatManilaDate } from '../../../utils/dates';
import { formatDuration } from '../../../utils/tripTimeline';
import { seatsLeftText, tripProgressText } from '../../../utils/passengerTripProgress';
import { cleanContactInput, looksLikePhone } from '../../../utils/travellerContact';
import { clock12 } from '../../../utils/clock';
import { baggageFeeFor } from '../../../utils/ticketExtras';

// Matches OnlineCheckoutRequest: the passenger picks GCash or Maya (C4). The payment
// page itself collects whatever else the provider needs.
// 2026-11-18 (user): each option shows the provider's own logo (from gcash.com and maya.ph, in public/images/payments).
const PAYMENT_CHANNELS = [
  { value: 'gcash', label: 'GCash', logo: '/images/payments/gcash.svg', logoClass: 'h-8' },
  { value: 'maya', label: 'Maya', logo: '/images/payments/maya.svg', logoClass: 'h-6' },
];


const LABEL = 'text-sm font-semibold text-navy-950';
const FIELD = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-navy-950 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20';
const SELECT = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-navy-950 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20';

function SummaryRow({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right font-semibold text-navy-950">{children}</dd>
    </div>
  );
}

/**
 * 2026-11-24 (user): Trip Details & Payment, in the order a passenger decides: the trip overview (when, where, seats
 * left), the route and stops (short list), then tickets and payment, with the booking summary beside it. `accountEmail`
 * is the signed-in passenger's email, where their ticket is sent.
 */
export default function BuyTicket({ onTicketPurchased, returnTo = '/', accountEmail = '' }) {
  const [ticketPreview, setTicketPreview] = useState(null);
  const [qrModalDismissedFor, setQrModalDismissedFor] = useState(null);
  const {
    availableRewardPoints,
    bookingLink,
    bookingMode,
    canProceedToOnlinePayment,
    departuresState,
    isToday,
    checkoutStatus,
    error,
    form,
    formErrors,
    formatDateTime,
    grossTotal,
    handleChange,
    handleJourneyChange,
    handleSubmit,
    hasFareQuote,
    hasRewardPoints,
    isGuestCheckout,
    isRewardRequestInsufficient,
    isSubmitting,
    loadingQr,
    loadingRewards,
    maxRedeemableRewardPoints,
    netTotal,
    bookingFee,
    bookingFeeRate,
    discountTypes = [],
    setDiscountClaim,
    priorityTypes = [],
    baggagePercent = 0,
    baggage = { count: 0, total: 0 },
    setTicketExtra = () => {},
    maxSeatsPerPurchase,
    totalDue,
    printQrTicket,
    qrTickets,
    resolution,
    rewardPointsToApply,
    selectAlightingStop,
    selectDeparture,
    stopsData,
    success,
    timelineState,
    totalTickets,
    travelDate,
    trip,
    unitFare,
  } = useBuyTicket({ onTicketPurchased });

  const { timeline } = timelineState;
  const boardingRow = timeline?.stops?.find((stop) => stop.is_boarding);
  const alightingRow = timeline?.stops?.find((stop) => stop.is_alighting);

  // Summary header: names come from the server's stop lists and timeline, never from literals.
  const [editingJourney, setEditingJourney] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const stopName = (stopId) => {
    const groups = [...stopsData.originGroups, ...stopsData.destinationGroups];
    for (const group of groups) {
      const match = group.stops.find((stop) => String(stop.stop_id) === String(stopId));
      if (match) return match.name;
    }
    return '';
  };
  const summaryFrom = boardingRow?.name || stopName(form.origin_stop_id);
  const summaryTo = (alightingRow && !alightingRow.custom ? alightingRow.name : '') || stopName(form.destination_stop_id);
  const boardingLabel = boardingRow?.name || summaryFrom;
  // Batch 79: times on a 12-hour clock, worked out before the memo below so React's compiler keeps it.
  const arrivalClock = clock12(alightingRow?.eta_time) || 'Arrival time not available';

  // The map dims everything outside the passenger's own segment. Memoised so the map only redraws
  // when the segment really changes.
  const highlightFrom = boardingRow?.stop_id ?? null;
  const highlightTo = alightingRow && !alightingRow.custom ? alightingRow.stop_id : null;
  const journeyHighlight = useMemo(
    () => (highlightFrom && highlightTo ? { fromStopId: highlightFrom, toStopId: highlightTo } : null),
    [highlightFrom, highlightTo],
  );

  // "Your Ticket QR" opens in its own modal. Derived (not effect-driven) so dismissing it for one
  // purchase doesn't suppress it for a later one: the identity of the current successful checkout
  // is the first ticket's uuid, and the modal reopens whenever that changes.
  const qrModalIdentity = checkoutStatus === 'success'
    ? (qrTickets[0]?.ticket_uuid || 'pending-qr')
    : null;
  const qrModalOpen = qrModalIdentity !== null && qrModalIdentity !== qrModalDismissedFor;

  // Batch 50 item 7 (user): a guest cannot see the ticket again without the email, so leaving an unsaved ticket asks
  // once (and the browser warns before the tab closes). Closing goes home for a guest, to My Tickets for an account.
  const navigate = useNavigate();
  const [savedFor, setSavedFor] = useState(null);
  const [confirmLeaveFor, setConfirmLeaveFor] = useState(null);
  const ticketSaved = savedFor !== null && savedFor === qrModalIdentity;
  const confirmLeave = confirmLeaveFor !== null && confirmLeaveFor === qrModalIdentity;
  const mustSave = qrModalOpen && isGuestCheckout && qrTickets.length > 0 && !ticketSaved;
  const markSaved = () => setSavedFor(qrModalIdentity);
  const closeTicket = () => {
    setQrModalDismissedFor(qrModalIdentity);
    navigate(isGuestCheckout ? '/' : '/passenger/dashboard?tab=tickets');
  };
  const requestClose = () => (mustSave ? setConfirmLeaveFor(qrModalIdentity) : closeTicket());
  useEffect(() => {
    if (!mustSave) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [mustSave]);

  const canSubmit = !isSubmitting && canProceedToOnlinePayment && !isRewardRequestInsufficient && Boolean(form.ticket_quantity);

  // The ticket stepper: - and + move one ticket within 1 and the server's per-booking limit; typing still works.
  const ticketCount = Math.max(1, parseInt(form.ticket_quantity, 10) || 1);
  const stepQuantity = (delta) => {
    const next = Math.min(Math.max(1, ticketCount + delta), Math.max(1, Number(maxSeatsPerPurchase) || 1));
    handleChange('ticket_quantity', String(next));
  };

  // Batch 65 (user, 2026-11-13): the times to choose from are the chosen trip's own kind (same journey, bus type and
  // service, so the same fare and stops); another bus type has its own card on Available trips.
  const sameKindDepartures = departuresState.departures.filter((departure) => !trip || sameTripGroup(departure, trip));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {bookingLink.status === 'checking' && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600 ring-1 ring-inset ring-slate-200">
          <Loader size={16} className="animate-spin" /> Checking your booking link...
        </div>
      )}

      {bookingLink.status === 'error' && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
          <span className="flex items-center gap-2"><AlertCircle size={16} className="shrink-0" />{bookingLink.message}</span>
          <Link to={returnTo} className="font-semibold text-navy-800 underline">Search for a trip</Link>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
          <CheckCircle size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {checkoutStatus === 'pending' && (
        <Card className="p-4">
          <h2 className="font-display text-lg font-semibold text-navy-950">Payment in progress</h2>
          <p className="mt-2 text-sm text-slate-500">
            Finish the payment in the payment tab (or in your GCash / Maya app if it opens). This page updates
            when the payment is confirmed. Your seat is saved once the payment goes through.
          </p>
        </Card>
      )}

      {/* "Your Ticket QR": the Group QR for a multi-ticket purchase, or the single ticket's own QR. */}
      <Modal
        open={qrModalOpen}
        onClose={requestClose}
        title="Your Ticket QR"
      >
        {confirmLeave && (
          <div role="alertdialog" aria-label="Save your ticket" className="mb-4 space-y-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200" data-testid="save-ticket-warning">
            <p className="font-semibold">You have not saved your ticket.</p>
            <p>As a guest, you can only find it again with the email we sent you. Save it to your phone first.</p>
            <div className="flex flex-wrap items-center gap-2">
              <SaveQrButton ticket={qrTickets[0]} group={qrTickets.length > 1} groupSize={qrTickets.length} active={Boolean(qrTickets.length > 1 ? qrTickets[0]?.group_qr_content : qrTickets[0]?.qr_content)} onSaved={markSaved} />
              <Button type="button" variant="outline" size="sm" onClick={closeTicket}>Leave anyway</Button>
            </div>
          </div>
        )}
        {loadingQr ? (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader size={16} className="animate-spin" /> Loading ticket QR...</div>
        ) : qrTickets.length === 0 ? (
          <p className="text-sm text-slate-500">Payment succeeded. Ticket QR will appear on your scheduled trip date.</p>
        ) : qrTickets.length > 1 ? (
          <div className="space-y-3">
            {qrTickets[0]?.group_qr_content ? (
              <div className="rounded-xl bg-teal-50 p-3 ring-1 ring-inset ring-teal-200">
                <p className="text-sm font-semibold text-teal-800">
                  Group Boarding QR: scan once to board all {qrTickets.length} tickets
                </p>
                <QrImage content={qrTickets[0].group_qr_content} alt="Group boarding QR" size={400} className="mt-2 h-40 w-40 rounded-lg" />
                <p className="mt-2 text-xs text-teal-700">
                  The chauffeur scans this QR to board all passengers in your order at once.
                </p>
                {qrTickets[0]?.tracking_code && (
                  <p className="mt-2 text-sm text-teal-900" data-testid="group-tracking-code">Tracking code: <strong className="font-data tracking-widest">{qrTickets[0].tracking_code}</strong></p>
                )}
                <div className="mt-3">
                  <SaveQrButton ticket={qrTickets[0]} group groupSize={qrTickets.length} active={Boolean(qrTickets[0]?.group_qr_content)} onSaved={markSaved} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Group QR will appear on your scheduled trip date.</p>
            )}

            <div className="space-y-2">
              {qrTickets.map((ticket, idx) => (
                <div key={ticket.ticket_uuid || idx} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-semibold text-navy-950">{ticket.origin || '-'} to {ticket.destination || '-'}</p>
                    <p className="mt-1 text-xs text-slate-500">{ticket.seat_type || 'seated'} · {formatDateTime(ticket.valid_from)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTicketPreview({ ticket, idx })}
                    className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-200 hover:bg-teal-100"
                  >
                    View Ticket
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <TicketCard
            fromLabel={qrTickets[0]?.origin}
            toLabel={qrTickets[0]?.destination}
            departureLabel={formatDateTime(qrTickets[0]?.valid_from)}
            seatLabel={qrTickets[0]?.seat_type || '-'}
            routeLabel={`${qrTickets[0]?.origin || '-'} to ${qrTickets[0]?.destination || '-'}`}
            qrContent={qrTickets[0]?.qr_content}
            statusLabel="Valid"
            validLabel={formatDateTime(qrTickets[0]?.valid_from)}
            expiresLabel={formatDateTime(qrTickets[0]?.expires_at)}
            discountLabel={qrTickets[0]?.discount_label || ''}
            discountAmount={qrTickets[0]?.discount_amount}
            originalFare={qrTickets[0]?.original_amount}
            farePaid={qrTickets[0]?.amount}
            discountVerified={Boolean(qrTickets[0]?.discount_id_checked_at)}
            trackingToken={qrTickets[0]?.tracking_token || ''}
            trackingCode={qrTickets[0]?.tracking_code || ''}
            ticketId={ticketIdOf(qrTickets[0]?.ticket_uuid)}
            travellerName={qrTickets[0]?.traveller_name || ''}
          />
        )}

        {qrTickets.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            {qrTickets.length === 1 ? (
              <SaveQrButton ticket={qrTickets[0]} active={Boolean(qrTickets[0]?.qr_content)} onSaved={markSaved} />
            ) : <span />}
            <div className="flex gap-2">
              {qrTickets.length === 1 && (
                <Button type="button" variant="outline" size="sm" onClick={() => printQrTicket(qrTickets[0], 0)} disabled={!qrTickets[0]?.qr_content}>
                  Print PDF
                </Button>
              )}
              <Button type="button" variant="primary" size="sm" onClick={requestClose}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="min-w-0 space-y-6">
            {/* 2026-11-24 (user): the trip overview leads: where, when, the departure and the seats left. Everything here
                comes from the server. */}
            <Card className="p-5 sm:p-6" aria-labelledby="trip-overview-title">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="trip-overview-title" className="text-balance font-display text-xl font-bold leading-snug text-navy-950 sm:text-2xl">
                    {summaryFrom || 'Where are you going?'}
                    {summaryTo ? (
                      <>
                        <ArrowRight size={20} className="mx-2 inline-block align-[-0.15em] text-teal-600" aria-hidden="true" />
                        <span className="sr-only">to </span>
                        {summaryTo}
                      </>
                    ) : null}
                  </h2>
                  {travelDate && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
                      <CalendarDays size={15} aria-hidden="true" /> {formatManilaDate(travelDate)}
                      {isToday ? <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">Today</span> : null}
                      {trip && tripProgressText(trip.progress) && (
                        <span data-testid="trip-progress" className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                          {tripProgressText(trip.progress)}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEditingJourney((open) => !open)}
                  aria-expanded={editingJourney}
                  className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-navy-900 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700/30"
                >
                  <Pencil size={13} aria-hidden="true" /> {editingJourney ? 'Done' : 'Edit trip'}
                </button>
              </div>

              {(editingJourney || !form.origin_stop_id || !form.destination_stop_id) && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  {stopsData.error && <p className="mb-2 text-xs text-red-600">{stopsData.error}</p>}
                  {stopsData.loadingOrigins ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500"><Loader size={16} className="animate-spin" /> Loading stops...</div>
                  ) : stopsData.originGroups.length === 0 ? (
                    <p className="text-sm text-slate-500">No routes are open for booking right now.</p>
                  ) : (
                    <JourneyFields
                      value={{ ...form, booking_date: travelDate }}
                      originGroups={stopsData.originGroups}
                      destinationGroups={stopsData.destinationGroups}
                      loadingDestinations={stopsData.loadingDestinations}
                      today={stopsData.today}
                      maxAdvanceDays={stopsData.maxAdvanceDays}
                      lastBookableDate={stopsData.lastBookableDate}
                      onChange={handleJourneyChange}
                      idPrefix="book"
                    />
                  )}
                </div>
              )}

              {form.origin_stop_id && form.destination_stop_id && (
                <div className="mt-5" aria-live="polite">
                  {resolution.loading && (
                    <div className="flex items-center gap-2 text-sm text-slate-500"><Loader size={16} className="animate-spin" /> Finding your bus...</div>
                  )}
                  {resolution.error && <p className="text-sm text-red-600">{resolution.error}</p>}

                  {/* Batch 76 (user): one list of the date's departures. Shown when there is a choice to make. */}
                  {bookingMode === 'later' && !resolution.loading && (sameKindDepartures.length > 1 || (!trip && sameKindDepartures.length > 0)) && (
                    <div className="mb-4">
                      <p className={LABEL}>Select departure time</p>
                      <p className="mt-0.5 text-xs text-slate-500">Leaving from {boardingLabel}</p>
                      <div role="radiogroup" aria-label="Departure time" className="mt-2 flex flex-wrap gap-2">
                        {sameKindDepartures.map((departure) => {
                          const selected = String(trip?.trip_id) === String(departure.trip_id);
                          return (
                            <button
                              key={departure.trip_id}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => selectDeparture(departure.trip_id)}
                              className={`rounded-xl border-2 px-3.5 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700/30 ${
                                selected ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white text-navy-900 hover:border-slate-300'
                              }`}
                            >
                              <span className="block font-bold tabular-nums">{clock12(departure.boarding_time) || departure.boarding_time}</span>
                              <span className="block text-xs text-slate-500">{seatsLeftText(departure.seats_left)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!resolution.loading && resolution.ready && !resolution.error && !trip && (
                    <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
                      <p>{resolution.message || 'No departures match your journey.'}</p>
                      <button type="button" onClick={() => setEditingJourney(true)} className="mt-1 font-semibold text-navy-800 underline underline-offset-2">
                        Change the date
                      </button>
                    </div>
                  )}

                  {trip && (
                    <>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-teal-50 px-4 py-3.5 ring-1 ring-inset ring-teal-100" data-testid="departure-band">
                        <p className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                          <Clock3 size={20} className="shrink-0 self-center text-teal-700" aria-hidden="true" />
                          <span className="font-display text-2xl font-bold tabular-nums text-navy-950">{clock12(trip.boarding_time) || trip.boarding_time}</span>
                          <span className="text-sm text-teal-900">departs from {boardingLabel}</span>
                        </p>
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-teal-800">
                          <Armchair size={17} aria-hidden="true" /> {seatsLeftText(trip.seats_left)}
                        </p>
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                        {[
                          [Clock3, 'Arrival', arrivalClock],
                          [Bus, 'Bus', busLabelText(trip.bus_label)],
                          [MapPin, 'Duration', formatDuration(timeline?.header?.duration_minutes) || 'Not provided'],
                        ].map(([Icon, label, value]) => (
                          <div key={label} className="min-w-0">
                            <dt className="flex items-center gap-1.5 text-xs text-slate-500"><Icon size={14} aria-hidden="true" /> {label}</dt>
                            <dd className="mt-1 text-sm font-semibold text-navy-950">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </>
                  )}
                  {trip && !trip.boarding_time_is_scheduled_offset && (
                    <p className="mt-3 text-xs text-slate-500">This is the trip start time; stop-by-stop times are not set for this route.</p>
                  )}
                  {formErrors.trip && <p role="alert" className="mt-2 text-xs text-red-600">{formErrors.trip}</p>}
                </div>
              )}
            </Card>

            {trip && (
              <>
                {/* The stops and the official-stop alighting choice; the short list opens with "Show all". Batch 76 (user):
                    the route map opens in a pop-up, so the page stays short; Track Bus has the live map. */}
                <TripTimeline
                  compact
                  timeline={timeline}
                  loading={timelineState.loading}
                  error={timelineState.error}
                  onSelectAlighting={selectAlightingStop}
                  footer={timeline?.trip?.route_id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowMap(true)}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-navy-800 bg-white px-4 text-sm font-semibold text-navy-900 transition hover:bg-navy-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700/30"
                        data-testid="view-route-map"
                      >
                        <MapIcon size={16} aria-hidden="true" /> View route map
                      </button>
                      <Modal open={showMap} onClose={() => setShowMap(false)} title="Route map" size="lg">
                        <RouteMap
                          routeId={timeline.trip.route_id}
                          direction={timeline.trip.leg_direction}
                          highlight={journeyHighlight}
                          showStatus={false}
                          className="relative h-[60vh] w-full"
                        />
                      </Modal>
                    </>
                  ) : null}
                />

                {/* Tickets, the options per ticket, the payment method and who gets the ticket. */}
                <Card className="p-5 sm:p-6" aria-labelledby="tickets-payment-title">
                  <h2 id="tickets-payment-title" className="font-display text-lg font-semibold text-navy-950">Tickets and payment</h2>

                  <div className="mt-5">
                    <label htmlFor="ticket_quantity" className={LABEL}>Number of tickets</label>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="inline-flex items-stretch overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-navy-700 focus-within:ring-2 focus-within:ring-navy-700/20">
                        <button
                          type="button"
                          aria-label="One ticket less"
                          onClick={() => stepQuantity(-1)}
                          disabled={ticketCount <= 1}
                          className="flex w-11 items-center justify-center text-navy-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                        >
                          <Minus size={16} aria-hidden="true" />
                        </button>
                        <input
                          id="ticket_quantity"
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max={maxSeatsPerPurchase}
                          step="1"
                          value={form.ticket_quantity}
                          onChange={(e) => handleChange('ticket_quantity', e.target.value)}
                          aria-invalid={Boolean(formErrors.ticket_quantity)}
                          aria-describedby={formErrors.ticket_quantity ? 'ticket_quantity_hint ticket_quantity_error' : 'ticket_quantity_hint'}
                          className="w-14 appearance-none border-x border-slate-300 py-2.5 text-center text-base font-semibold tabular-nums text-navy-950 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          aria-label="One ticket more"
                          onClick={() => stepQuantity(1)}
                          disabled={ticketCount >= maxSeatsPerPurchase}
                          className="flex w-11 items-center justify-center text-navy-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                        >
                          <Plus size={16} aria-hidden="true" />
                        </button>
                      </div>
                      <p id="ticket_quantity_hint" className="text-xs text-slate-500">Up to {maxSeatsPerPurchase} tickets per booking.</p>
                    </div>
                    {formErrors.ticket_quantity && <span id="ticket_quantity_error" role="alert" className="mt-1.5 block text-xs text-red-600">{formErrors.ticket_quantity}</span>}
                  </div>

                  {ticketCount > 1 && (
                    <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-teal-600"
                        checked={form.email_group_qr !== false}
                        onChange={(e) => handleChange('email_group_qr', e.target.checked)}
                      />
                      <span>
                        Send one group QR for all tickets
                        <span className="block text-xs text-slate-500">One scan boards everyone, so travel together. Untick to get one QR per ticket if you will arrive separately.</span>
                      </span>
                    </label>
                  )}

                  {/* Batch 75 (panel): claim a discount online; the Chauffeur checks the ID on the bus. Batch 76 (user): with a
                      priority seat and baggage, per ticket. 2026-11-24 (user): a senior or PWD discount sets the priority seat. */}
                  {(discountTypes.length > 0 || priorityTypes.length > 0 || baggagePercent > 0) && (
                    <fieldset className="mt-6 border-t border-slate-100 pt-5" data-testid="ticket-options">
                      <legend className="sr-only">Ticket options</legend>
                      <p aria-hidden="true" className={LABEL}>Ticket options</p>
                      <ul className="mt-1 space-y-1 text-xs text-slate-500">
                        {discountTypes.length > 0 && (
                          <li>Valid for discount: you pay the full fare now and show your valid ID to the Chauffeur. Once approved, the {ratePercent(discountTypes[0].rate)} discount goes back to your {form.payment_channel === 'maya' ? 'Maya' : 'GCash'}.</li>
                        )}
                        {priorityTypes.length > 0 && <li>Priority seats are for senior citizens, persons with disability and pregnant passengers. The Chauffeur checks on the bus.</li>}
                        {baggagePercent > 0 && <li>Baggage in the compartment costs {baggagePercent}% of the fare.</li>}
                      </ul>
                      <div className="mt-2 divide-y divide-slate-100">
                        {Array.from({ length: ticketCount }, (_, index) => {
                          const extra = form.ticket_extras?.[index] || {};
                          return (
                            <div key={index} className="py-3">
                              {ticketCount > 1 && <p className="mb-2 text-sm font-semibold text-navy-950">Ticket {index + 1}</p>}
                              <div className="grid gap-3 sm:grid-cols-2">
                                {discountTypes.length > 0 && (
                                  <label className="block text-sm font-medium text-slate-700">
                                    Valid for Discount?
                                    <select
                                      className={SELECT}
                                      value={form.discount_claims?.[index] || ''}
                                      onChange={(e) => setDiscountClaim(index, e.target.value)}
                                      data-testid={`discount-claim-${index}`}
                                    >
                                      <option value="">No discount</option>
                                      {discountTypes.map((type) => <option key={type.key} value={type.key}>{type.label} ({ratePercent(type.rate)})</option>)}
                                    </select>
                                  </label>
                                )}
                                {priorityTypes.length > 0 && (
                                  <label className="block text-sm font-medium text-slate-700">
                                    Priority seat
                                    <select
                                      className={SELECT}
                                      value={extra.priority_type || ''}
                                      onChange={(e) => setTicketExtra(index, 'priority_type', e.target.value)}
                                      data-testid={`priority-${index}`}
                                    >
                                      <option value="">No</option>
                                      {priorityTypes.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
                                    </select>
                                  </label>
                                )}
                              </div>
                              {baggagePercent > 0 && (
                                <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300 accent-teal-600"
                                    checked={Boolean(extra.baggage)}
                                    onChange={(e) => setTicketExtra(index, 'baggage', e.target.checked)}
                                    data-testid={`baggage-${index}`}
                                  />
                                  <span>
                                    Baggage in the compartment{' '}
                                    {hasFareQuote && <span className="whitespace-nowrap text-slate-500">(+PHP {baggageFeeFor(unitFare, baggagePercent).toFixed(2)})</span>}
                                  </span>
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </fieldset>
                  )}

                  <fieldset className="mt-6 border-t border-slate-100 pt-5">
                    <legend className="sr-only">Payment method</legend>
                    <p aria-hidden="true" className={`flex items-center gap-2 ${LABEL}`}><CreditCard size={16} aria-hidden="true" /> Payment method</p>
                    <p className="mt-1 text-sm text-slate-500">Online booking is paid online. You finish paying on the provider&apos;s secure page.</p>

                    <div role="radiogroup" aria-label="Payment method" className="mt-3 grid gap-3 sm:grid-cols-2">
                      {PAYMENT_CHANNELS.map((channel) => {
                        const isSelected = form.payment_channel === channel.value;
                        return (
                          <button
                            key={channel.value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => handleChange('payment_channel', channel.value)}
                            className={`flex min-h-14 items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700/30 sm:px-4 ${
                              isSelected ? 'border-teal-500 bg-teal-50 text-teal-900' : 'border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? 'border-teal-600' : 'border-slate-300'}`}
                            >
                              {isSelected && <span className="block h-2 w-2 rounded-full bg-teal-600" />}
                            </span>
                            <span className="flex h-8 items-center" aria-hidden="true">
                              <img src={channel.logo} alt="" className={`${channel.logoClass} w-auto`} />
                            </span>
                            <span>{channel.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  {/* 2026-11-24 (user): who gets the ticket. "Book for someone" turns this slot into the traveller's name and
                      contact. The ticket still goes to the buyer: a guest keeps their own email below (the only way to find the
                      ticket again); a signed-in passenger's goes to the account email. Batch 51 item 7: their contact is an email
                      or a mobile number (numbers only once a digit is typed); no SMS is sent. */}
                  <div className="mt-6 border-t border-slate-100 pt-5" role="group" aria-labelledby="ticket-contact-title" data-testid="for-someone-else">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p id="ticket-contact-title" className={LABEL}>{form.for_someone_else ? 'Who is travelling' : 'Your ticket'}</p>
                      <label
                        className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-navy-700/30 ${
                          form.for_someone_else ? 'border-teal-500 bg-teal-50 text-teal-900' : 'border-slate-300 text-navy-900 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(form.for_someone_else)}
                          onChange={(e) => handleChange('for_someone_else', e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 accent-teal-600 focus:outline-none"
                        />
                        Book for someone
                      </label>
                    </div>

                    {form.for_someone_else && (
                      <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-semibold text-navy-950">
                          Their name
                          <input type="text" value={form.traveller_name} onChange={(e) => handleChange('traveller_name', e.target.value)} aria-invalid={Boolean(formErrors.traveller_name)} maxLength={100} autoComplete="off" className={FIELD} />
                          {formErrors.traveller_name && <span role="alert" className="mt-1 block text-xs font-medium text-red-600">{formErrors.traveller_name}</span>}
                        </label>
                        <label className="block text-sm font-semibold text-navy-950">
                          Their email or mobile number
                          <input
                            type="text"
                            inputMode={looksLikePhone(form.traveller_contact) ? 'tel' : 'email'}
                            value={form.traveller_contact}
                            onChange={(e) => handleChange('traveller_contact', cleanContactInput(e.target.value))}
                            aria-invalid={Boolean(formErrors.traveller_contact)}
                            placeholder="name@example.com or 09171234567"
                            autoComplete="off"
                            className={FIELD}
                          />
                          {formErrors.traveller_contact && <span role="alert" className="mt-1 block text-xs font-medium text-red-600">{formErrors.traveller_contact}</span>}
                        </label>
                        <p className="text-xs font-normal text-slate-500 sm:col-span-2">Their ticket is sent to your email. Send it to them, or give them the Ticket ID to show the Chauffeur.</p>
                      </div>
                    )}

                    {isGuestCheckout ? (
                      <label className="mt-4 block text-sm font-semibold text-navy-950">
                        {/* Batch 50 item 7 (user): required for a guest; the ticket and tracking code are sent here. */}
                        {form.for_someone_else ? 'Your email (we send the ticket here)' : 'Email for your ticket'} <span className="text-red-600" aria-hidden="true">*</span>
                        <input
                          type="email"
                          autoComplete="email"
                          aria-required="true"
                          aria-invalid={Boolean(formErrors.guest_email)}
                          value={form.guest_email}
                          onChange={(e) => handleChange('guest_email', e.target.value)}
                          placeholder="you@example.com"
                          className={FIELD}
                        />
                        <span className="mt-1 block text-xs font-normal text-slate-500">Your ticket and tracking code are sent here. You need it to find your ticket again.</span>
                        {formErrors.guest_email && <span role="alert" className="mt-1 block text-xs font-medium text-red-600">{formErrors.guest_email}</span>}
                      </label>
                    ) : !form.for_someone_else && (
                      <p className="mt-3 flex items-center gap-2.5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700" data-testid="account-email">
                        <Mail size={16} className="shrink-0 text-slate-500" aria-hidden="true" />
                        <span className="min-w-0 break-words">
                          Your ticket is sent to {accountEmail ? <strong className="font-semibold text-navy-950">{accountEmail}</strong> : 'your account email'}.
                        </span>
                      </p>
                    )}
                  </div>

                  {!isGuestCheckout && (
                    <div className="mt-6 border-t border-slate-100 pt-4">
                      <p className="text-sm text-slate-500">
                        {loadingRewards ? 'Loading reward balance...' : <>Available Rewards: <strong className="text-navy-950">{Number(availableRewardPoints || 0).toFixed(0)} points</strong></>}
                      </p>
                      <Toggle
                        checked={Boolean(form.use_rewards)}
                        onChange={(checked) => handleChange('use_rewards', checked)}
                        disabled={!hasRewardPoints}
                        label="Use reward points"
                        description={
                          !hasRewardPoints && !loadingRewards
                            ? "Disabled: you don't have any reward points to redeem yet. Earn points by completing paid trips."
                            : undefined
                        }
                      />
                      {form.use_rewards && (
                        <div className="pb-1">
                          <label htmlFor="reward_points_to_use" className={`${LABEL} mt-2 block`}>Points to use</label>
                          <input
                            id="reward_points_to_use"
                            type="number"
                            min="0"
                            step="1"
                            value={form.reward_points_to_use}
                            onChange={(e) => handleChange('reward_points_to_use', e.target.value)}
                            aria-invalid={Boolean(formErrors.reward_points_to_use) || isRewardRequestInsufficient}
                            aria-describedby="reward_points_hint"
                            className={FIELD}
                          />
                          <div id="reward_points_hint" role={isRewardRequestInsufficient ? 'alert' : undefined} className={`mt-1.5 text-xs ${isRewardRequestInsufficient ? 'text-red-600' : 'text-slate-500'}`}>
                            You can use up to {Number(maxRedeemableRewardPoints || 0).toFixed(0)} points now
                            {isRewardRequestInsufficient ? ' (insufficient for requested amount)' : ''}
                          </div>
                          {formErrors.reward_points_to_use && <div role="alert" className="mt-1 text-xs text-red-600">{formErrors.reward_points_to_use}</div>}
                        </div>
                      )}
                    </div>
                  )}
                  {formErrors.payment && <p role="alert" className="mt-3 text-xs text-red-600">{formErrors.payment}</p>}
                  {formErrors.destination_stop_id && <p role="alert" className="mt-3 text-xs text-red-600">{formErrors.destination_stop_id}</p>}
                </Card>
              </>
            )}
          </div>

          {/* Booking Summary: always in view on a wide screen, filling in as the choices are made. */}
          <Card className="h-fit p-5 sm:p-6 lg:sticky lg:top-6" aria-labelledby="booking-summary-title">
            <h2 id="booking-summary-title" className="font-display text-lg font-semibold text-navy-950">Booking summary</h2>
            <dl className="mt-3 divide-y divide-slate-100 text-sm">
              <SummaryRow label="Board at">{boardingRow?.name || summaryFrom || '-'}</SummaryRow>
              <SummaryRow label="Get off at">{alightingRow?.name || summaryTo || '-'}</SummaryRow>
              <SummaryRow label="Departure">{trip ? `${formatManilaDate(trip.trip_date)} ${clock12(trip.boarding_time) || trip.boarding_time}` : '-'}</SummaryRow>
              <SummaryRow label="Payment">Online &middot; {form.payment_channel === 'maya' ? 'Maya' : 'GCash'}</SummaryRow>
              <SummaryRow label="Unit fare">
                PHP {hasFareQuote ? Number(unitFare).toFixed(2) : '0.00'}
              </SummaryRow>
              <SummaryRow label="Quantity">{totalTickets}</SummaryRow>
              <SummaryRow label="Gross total">PHP {Number(grossTotal || 0).toFixed(2)}</SummaryRow>
              {baggage.count > 0 && <SummaryRow label={`Baggage (${baggage.count})`}>PHP {Number(baggage.total).toFixed(2)}</SummaryRow>}
              {/* Rewards are for signed-in passengers only; a guest has none to apply. */}
              {!isGuestCheckout && <SummaryRow label="Rewards applied">{Number(rewardPointsToApply || 0).toFixed(0)} points</SummaryRow>}
              {!isGuestCheckout && (
                <SummaryRow label={baggage.count > 0 ? 'Fare and baggage after rewards' : 'Fare after rewards'}>PHP {Number(netTotal || 0).toFixed(2)}</SummaryRow>
              )}
              <SummaryRow label={bookingFeeRate ? `Transaction fee (${bookingFeeRate})` : 'Transaction fee'}>{bookingFee === null ? 'Not provided' : `PHP ${Number(bookingFee).toFixed(2)}`}</SummaryRow>
            </dl>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-teal-50 px-4 py-3 ring-1 ring-inset ring-teal-100">
              <span className="text-sm font-semibold text-teal-900">Total to pay</span>
              <span className="font-display text-xl font-bold tabular-nums text-navy-950" data-testid="total-to-pay">
                {totalDue === null ? 'Not provided' : `PHP ${Number(totalDue).toFixed(2)}`}
              </span>
            </div>
            {bookingFee > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Online payments have a transaction fee of {bookingFeeRate} of the amount for {form.payment_channel === 'maya' ? 'Maya' : 'GCash'} (PHP {Number(bookingFee).toFixed(2)} here), once for each payment however many tickets you buy. Tickets bought with cash on the bus have no fee.
              </p>
            )}
            {timeline?.fare?.error && <p className="mt-2 text-xs text-red-600">{timeline.fare.error}</p>}
            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy-800 text-base font-semibold text-white shadow-sm transition hover:bg-navy-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
            >
              {isSubmitting ? (
                <><Loader size={16} className="animate-spin" /> Processing...</>
              ) : (
                <>Continue to Payment <ArrowRight size={17} aria-hidden="true" /></>
              )}
            </button>
            {/* Batch 49 item 1 (user's wording): seats are taken only when the payment is confirmed. */}
            {canSubmit && <p className="mt-2 text-center text-xs text-slate-500">Proceed to checkout to save the seat.</p>}
            {!canSubmit && !isSubmitting && (
              <p className="mt-2 text-center text-xs text-slate-500">
                {!form.origin_stop_id || !form.destination_stop_id
                  ? 'Choose where you board and where you get off.'
                  : !trip
                    ? 'Choose a departure to continue.'
                    : 'Choose where you get off to see your fare.'}
              </p>
            )}
          </Card>
        </div>
      </form>

      <Modal open={Boolean(ticketPreview?.ticket)} onClose={() => setTicketPreview(null)} title="Ticket Details">
        {ticketPreview?.ticket && (
          <>
            <div className="mb-3 flex flex-wrap justify-end gap-2">
              <SaveQrButton ticket={ticketPreview.ticket} active={Boolean(ticketPreview.ticket.qr_content)} />
              <button
                type="button"
                onClick={() => printQrTicket(ticketPreview.ticket, ticketPreview.idx)}
                disabled={!ticketPreview.ticket.qr_content}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
              >
                Print PDF
              </button>
            </div>

            <TicketCard
              fromLabel={ticketPreview.ticket.origin}
              toLabel={ticketPreview.ticket.destination}
              departureLabel={formatDateTime(ticketPreview.ticket.valid_from)}
              seatLabel={ticketPreview.ticket.seat_type || '-'}
              routeLabel={`${ticketPreview.ticket.origin || '-'} to ${ticketPreview.ticket.destination || '-'}`}
              qrContent={ticketPreview.ticket.qr_content}
              statusLabel="Valid"
              amountLabel={`PHP ${Number(ticketPreview.ticket.amount || 0).toFixed(2)}`}
              validLabel={formatDateTime(ticketPreview.ticket.valid_from)}
              expiresLabel={formatDateTime(ticketPreview.ticket.expires_at)}
              trackingToken={ticketPreview.ticket.tracking_token || ''}
              trackingCode={ticketPreview.ticket.tracking_code || ''}
              ticketId={ticketIdOf(ticketPreview.ticket.ticket_uuid)}
              travellerName={ticketPreview.ticket.traveller_name || ''}
            />
          </>
        )}
      </Modal>
    </div>
  );
}
