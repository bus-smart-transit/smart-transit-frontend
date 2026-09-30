import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CreditCard, AlertCircle, CheckCircle, Loader, Pencil, Wallet, Smartphone } from 'lucide-react';
import useBuyTicket from '../../../api/hooks/Passenger/useBuyTicket';
import TicketCard from '../Ticket/TicketCard';
import QrImage from '../Ticket/QrImage';
import TripTimeline from '../Timeline/TripTimeline';
import CustomDropoffModal from '../Timeline/CustomDropoffModal';
import JourneyFields from './JourneyFields';
import SaveQrButton from '../Ticket/SaveQrButton';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Toggle from '../../ui/Toggle';
import Modal from '../../ui/Modal';
import RouteMap from '../../Map/RouteMap';
import { formatManilaDate } from '../../../utils/dates';

// Matches OnlineCheckoutRequest: the passenger picks GCash or Maya (C4). The payment
// page itself collects whatever else the provider needs.
const PAYMENT_CHANNELS = [
  { value: 'gcash', label: 'GCash', icon: Smartphone },
  { value: 'maya', label: 'Maya', icon: Wallet },
];

const inputClass = 'min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30';

function SummaryRow({ label, children, last = false }) {
  return (
    <div className={`flex justify-between gap-2 ${last ? '' : 'border-b border-slate-100 pb-1.5'}`}>
      <span className="text-xs text-slate-500">{label}</span>
      <strong className="text-right text-sm text-navy-950">{children}</strong>
    </div>
  );
}

export default function BuyTicket({ onTicketPurchased }) {
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
    applyDropoff,
    clearDropoff,
    closeDropoffModal,
    dropoff,
    dropoffDraft,
    dropoffError,
    dropoffModalVisible,
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
    openDropoffModal,
    printQrTicket,
    qrTickets,
    resolution,
    rewardPointsToApply,
    selectAlightingStop,
    selectDeparture,
    setDropoffDraft,
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

  const canSubmit = !isSubmitting && canProceedToOnlinePayment && !isRewardRequestInsufficient && Boolean(form.ticket_quantity);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      {bookingLink.status === 'checking' && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600 ring-1 ring-inset ring-slate-200">
          <Loader size={16} className="animate-spin" /> Checking your booking link...
        </div>
      )}

      {bookingLink.status === 'error' && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
          <span className="flex items-center gap-2"><AlertCircle size={16} className="shrink-0" />{bookingLink.message}</span>
          <Link to="/passenger#search-trips" className="font-semibold text-navy-800 underline">Search for a trip</Link>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200">
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
          <h2 className="font-display text-lg font-semibold text-navy-950">Checkout in Progress</h2>
          <p className="mt-2 text-sm text-slate-500">
            Finish the payment in the payment tab (or in your GCash / Maya app if it opens). This page updates
            when the payment is confirmed. Your seats are held for a short time while you pay.
          </p>
        </Card>
      )}

      {/* "Your Ticket QR": the Group QR for a multi-ticket purchase, or the single ticket's own QR. */}
      <Modal
        open={qrModalOpen}
        onClose={() => setQrModalDismissedFor(qrModalIdentity)}
        title="Your Ticket QR"
      >
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
                  The conductor scans this QR to board all passengers in your order at once.
                </p>
                <div className="mt-3">
                  <SaveQrButton ticket={qrTickets[0]} group groupSize={qrTickets.length} active={Boolean(qrTickets[0]?.group_qr_content)} />
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
          />
        )}

        {qrTickets.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            {qrTickets.length === 1 ? (
              <SaveQrButton ticket={qrTickets[0]} active={Boolean(qrTickets[0]?.qr_content)} />
            ) : <span />}
            <div className="flex gap-2">
              {qrTickets.length === 1 && (
                <Button type="button" variant="outline" size="sm" onClick={() => printQrTicket(qrTickets[0], 0)} disabled={!qrTickets[0]?.qr_content}>
                  Print PDF
                </Button>
              )}
              <Button type="button" variant="primary" size="sm" onClick={() => setQrModalDismissedFor(qrModalIdentity)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Summary header: From, To, Date (Manila), with an inline way to change them. */}
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your trip</span>
              <h2 className="mt-1 font-display text-xl font-bold text-navy-950 sm:text-2xl">
                {summaryFrom || 'Where are you going?'}
                {summaryTo ? <span className="mx-2 text-slate-400" aria-hidden="true">&rarr;</span> : null}
                {summaryTo}
              </h2>
              {travelDate && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <CalendarDays size={14} aria-hidden="true" /> {formatManilaDate(travelDate)}
                  {isToday ? <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">Today</span> : null}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setEditingJourney((open) => !open)}
              aria-expanded={editingJourney}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-navy-900 transition hover:bg-slate-50"
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
                  onChange={handleJourneyChange}
                  idPrefix="book"
                />
              )}
            </div>
          )}
        </Card>

        {form.origin_stop_id && form.destination_stop_id && (
          <>
            {/* 2-3. Book Now / Book Later, and the trip they resolve to (no separate results page). */}
            <Card className="p-4 sm:p-5">
              <fieldset>
                <legend className="text-sm font-semibold text-navy-950">When do you want to travel?</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[['now', 'Book Now'], ['later', 'Book Later']].map(([option, label]) => {
                    const disabled = option === 'now' && !isToday;
                    const checked = bookingMode === option;
                    return (
                      <label
                        key={option}
                        className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                          disabled ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                            : checked ? 'cursor-pointer border-navy-700 bg-navy-50 text-navy-900'
                              : 'cursor-pointer border-slate-300 text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="booking_option"
                          value={option}
                          checked={checked}
                          disabled={disabled}
                          onChange={() => handleJourneyChange('booking_option', option)}
                          className="h-4 w-4 accent-navy-800"
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {!isToday
                    ? `Book Now is for today's buses. For ${formatManilaDate(travelDate)} choose a departure below.`
                    : bookingMode === 'now'
                      ? 'We book the next bus that leaves today.'
                      : 'Choose one of the later departures today.'}
                </p>
              </fieldset>

              <div className="mt-4" aria-live="polite">
                {resolution.loading && (
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Loader size={16} className="animate-spin" /> Finding your bus...</div>
                )}
                {resolution.error && <p className="text-sm text-red-600">{resolution.error}</p>}

                {bookingMode === 'later' && !resolution.loading && departuresState.departures.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600">Departure time (Manila) at {boardingLabel}</p>
                    <div role="radiogroup" aria-label="Departure time" className="mt-2 flex flex-wrap gap-2">
                      {departuresState.departures.map((departure) => {
                        const selected = String(trip?.trip_id) === String(departure.trip_id);
                        return (
                          <button
                            key={departure.trip_id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => selectDeparture(departure.trip_id)}
                            className={`rounded-xl border-2 px-3.5 py-2 text-left text-sm transition ${
                              selected ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white text-navy-900 hover:border-slate-300'
                            }`}
                          >
                            <span className="block font-bold">{departure.boarding_time}</span>
                            <span className="block text-[0.7rem] text-slate-500">{departure.seats_left} {form.seat_type} left</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!resolution.loading && resolution.ready && !resolution.error && !trip && (
                  <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
                    <p>{resolution.message || 'No departures match your journey.'}</p>
                    <button type="button" onClick={() => setEditingJourney(true)} className="mt-1 font-semibold text-navy-800 underline">
                      Change the date
                    </button>
                  </div>
                )}

                {trip && (
                  <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      ['Boards at', `${boardingLabel} ${trip.boarding_time}`],
                      ['Date', formatManilaDate(trip.trip_date)],
                      ['Vehicle', trip.plate_number || '-'],
                      ['Seats left', `${trip.seats_left} ${form.seat_type}`],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs text-slate-400">{label}</dt>
                        <dd className="mt-0.5 text-sm font-semibold text-navy-950">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {trip && !trip.boarding_time_is_scheduled_offset && (
                  <p className="mt-2 text-xs text-slate-500">This is the trip start time; a per-stop schedule is not set for this route.</p>
                )}
                {formErrors.trip && <p className="mt-2 text-xs text-red-600">{formErrors.trip}</p>}
              </div>
            </Card>

            {trip && (
              <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
                <div className="min-w-0 space-y-4">
                  {/* 4-5. Travel Advice timeline, alighting selector and custom drop-off. */}
                  <TripTimeline
                    timeline={timeline}
                    loading={timelineState.loading}
                    error={dropoffModalVisible ? null : timelineState.error}
                    onSelectAlighting={selectAlightingStop}
                    onOpenCustomDropoff={openDropoffModal}
                    onClearCustomDropoff={clearDropoff}
                  />

                  {/* 7. The shared route map, highlighting the boarding-to-alighting segment. */}
                  {timeline?.trip?.route_id && (
                    <Card className="overflow-hidden p-0">
                      <RouteMap
                        routeId={timeline.trip.route_id}
                        direction={timeline.trip.leg_direction}
                        highlight={journeyHighlight}
                        showStatus={false}
                        className="relative h-72 w-full"
                      />
                    </Card>
                  )}

                  {/* 6. Seat, quantity and payment. */}
                  <Card className="space-y-5 p-4 sm:p-5">
                    <h2 className="font-display text-lg font-semibold text-navy-950">Seat and Payment</h2>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <fieldset>
                        <legend className="mb-1.5 text-xs font-semibold text-slate-600">Seat type</legend>
                        <div className="flex flex-wrap gap-2">
                          {['seated', 'standing'].map((type) => (
                            <label key={type} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm capitalize text-navy-900">
                              <input type="radio" name="seat_type" value={type} checked={form.seat_type === type} onChange={(e) => handleChange('seat_type', e.target.value)} />
                              <span>{type}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <label className="block text-xs font-semibold text-slate-600">
                        Ticket quantity
                        <input
                          type="number"
                          min="1"
                          max="20"
                          step="1"
                          value={form.ticket_quantity}
                          onChange={(e) => handleChange('ticket_quantity', e.target.value)}
                          className={`${inputClass} mt-1.5`}
                        />
                        {formErrors.ticket_quantity && <span className="mt-1.5 block text-xs text-red-600">{formErrors.ticket_quantity}</span>}
                      </label>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-navy-950">Payment</p>
                      <p className="mt-1 text-sm text-slate-500">Choose GCash or Maya. You finish paying on the provider&apos;s secure page.</p>

                      <div role="radiogroup" aria-label="Payment method" className="mt-3 grid grid-cols-2 gap-2">
                        {PAYMENT_CHANNELS.map((channel) => {
                          const isSelected = form.payment_channel === channel.value;
                          return (
                            <button
                              key={channel.value}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => handleChange('payment_channel', channel.value)}
                              className={`flex flex-col items-center gap-1 rounded-lg border-2 px-3 py-2.5 text-xs font-semibold transition ${
                                isSelected ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                              }`}
                            >
                              <channel.icon className="h-4 w-4" />
                              {channel.label}
                            </button>
                          );
                        })}
                      </div>

                      {isGuestCheckout && (
                        <label className="mt-3 block text-xs font-semibold text-slate-600">
                          Email to find your ticket later (optional)
                          <input
                            type="email"
                            value={form.guest_email}
                            onChange={(e) => handleChange('guest_email', e.target.value)}
                            placeholder="you@example.com"
                            className={`${inputClass} mt-1.5`}
                          />
                        </label>
                      )}

                      {!isGuestCheckout && (
                        <>
                          <div className="mt-3 text-sm text-slate-500">
                            {loadingRewards ? 'Loading reward balance...' : `Available Rewards: ${Number(availableRewardPoints || 0).toFixed(0)} RP`}
                          </div>
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
                            <>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={form.reward_points_to_use}
                                onChange={(e) => handleChange('reward_points_to_use', e.target.value)}
                                placeholder="Reward points to use"
                                className={`${inputClass} mt-2`}
                              />
                              <div className={`mt-1.5 text-xs ${isRewardRequestInsufficient ? 'text-red-600' : 'text-slate-500'}`}>
                                Max usable now: {Number(maxRedeemableRewardPoints || 0).toFixed(0)} RP
                                {isRewardRequestInsufficient ? ' (insufficient for requested amount)' : ''}
                              </div>
                              {formErrors.reward_points_to_use && <div className="mt-1 text-xs text-red-600">{formErrors.reward_points_to_use}</div>}
                            </>
                          )}
                        </>
                      )}
                      {formErrors.payment && <p className="mt-2 text-xs text-red-600">{formErrors.payment}</p>}
                      {formErrors.destination_stop_id && <p className="mt-2 text-xs text-red-600">{formErrors.destination_stop_id}</p>}
                    </div>
                  </Card>
                </div>

                <Card className="h-fit p-4 sm:p-5 lg:sticky lg:top-6">
                  <h2 className="font-display text-lg font-semibold text-navy-950">Booking Summary</h2>
                  <div className="mt-3 space-y-2">
                    <SummaryRow label="Board at">{boardingRow?.name || '-'}</SummaryRow>
                    <SummaryRow label="Get off at">{alightingRow ? (alightingRow.custom ? (dropoff?.label || 'Custom drop-off') : alightingRow.name) : '-'}</SummaryRow>
                    <SummaryRow label="Departure">{trip.trip_date} {trip.boarding_time}</SummaryRow>
                    <SummaryRow label="Seat Type">{form.seat_type}</SummaryRow>
                    <SummaryRow label="Unit Fare">PHP {hasFareQuote ? Number(unitFare).toFixed(2) : '0.00'}</SummaryRow>
                    <SummaryRow label="Quantity">{totalTickets}</SummaryRow>
                    <SummaryRow label="Gross Total">PHP {Number(grossTotal || 0).toFixed(2)}</SummaryRow>
                    <SummaryRow label="Rewards Applied">{Number(rewardPointsToApply || 0).toFixed(0)} RP</SummaryRow>
                    <SummaryRow label="Net Total" last>PHP {Number(netTotal || 0).toFixed(2)}</SummaryRow>
                  </div>
                  {timeline?.fare?.error && <p className="mt-2 text-xs text-red-600">{timeline.fare.error}</p>}
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="mt-4 flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-navy-800 text-sm font-semibold text-white hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <><Loader size={14} className="animate-spin" /> Processing...</>
                    ) : (
                      <><CreditCard size={14} /> Continue to Payment</>
                    )}
                  </button>
                </Card>
              </section>
            )}
          </>
        )}
      </form>

      {trip && timeline && (
        <CustomDropoffModal
          open={dropoffModalVisible}
          routeId={timeline.trip.route_id}
          direction={timeline.trip.leg_direction}
          highlight={null}
          pin={dropoffDraft}
          busy={Boolean(dropoff) && timelineState.loading}
          error={dropoffError}
          onPinChange={setDropoffDraft}
          onClose={closeDropoffModal}
          onConfirm={applyDropoff}
        />
      )}

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
            />
          </>
        )}
      </Modal>
    </div>
  );
}
