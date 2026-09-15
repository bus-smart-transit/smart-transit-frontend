import { useState } from 'react';
import { MapPin, Clock, CreditCard, AlertCircle, CheckCircle, Loader, LocateFixed, Users, Wallet, Smartphone } from 'lucide-react';
import useBuyTicket from '../../../api/hooks/Passenger/useBuyTicket';
import TicketCard from '../Ticket/TicketCard';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Toggle from '../../ui/Toggle';
import Modal from '../../ui/Modal';
import { parseAppDate } from '../../../utils/dates';
import heroBg from '../../../assets/hero.png';

// Matches the backend's accepted payment_channel values (see
// OnlineCheckoutRequest::rules() — 'in:gcash,maya,card').
const PAYMENT_CHANNELS = [
  { value: 'gcash', label: 'GCash', icon: Smartphone },
  { value: 'maya', label: 'Maya', icon: Wallet },
  { value: 'card', label: 'Card', icon: CreditCard },
];


const toCompactTime = (value) => {
  if (!value) return '';
  const str = String(value).trim();
  const hhmmss = str.match(/^(\d{2}:\d{2})(?::\d{2})?$/);
  if (hhmmss) return hhmmss[1];
  return str;
};

const toDateLabel = (value) => {
  if (!value) return '-';
  const date = parseAppDate(value);
  if (!date) return '-';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;
};

const getTripScheduleLabel = (trip) => {
  const dateLabel = toDateLabel(trip?.trip_date);
  // Use the trip's actual scheduled departure_time, not fleet_route's
  // general operating-hours window (start_time-end_time) — that range is
  // the whole fleet route's daily service window, not this specific trip's
  // departure time.
  const departureTime = toCompactTime(trip?.departure_time || trip?.fleet_route?.start_time);

  if (departureTime) return `${dateLabel} ${departureTime}`;
  return dateLabel;
};

const toSeatAvailability = (trip, fleet) => {
  const seatedTotal = Number(fleet?.seated_capacity ?? 0);
  const standingTotal = Number(fleet?.standing_capacity ?? 0);

  const explicitSeatedAvailable = trip?.available_seated_capacity ?? trip?.available_seated ?? trip?.remaining_seated_capacity;
  const explicitStandingAvailable = trip?.available_standing_capacity ?? trip?.available_standing ?? trip?.remaining_standing_capacity;

  let seatedLeft;
  let standingLeft;

  if (explicitSeatedAvailable != null || explicitStandingAvailable != null) {
    seatedLeft = Number(explicitSeatedAvailable ?? 0);
    standingLeft = Number(explicitStandingAvailable ?? 0);
  } else {
    // Backend stores current_* as occupied counts, so remaining is total-current.
    const currentSeated = Number(trip?.current_seated_capacity ?? 0);
    const currentStanding = Number(trip?.current_standing_capacity ?? 0);
    seatedLeft = Math.max(0, seatedTotal - currentSeated);
    standingLeft = Math.max(0, standingTotal - currentStanding);
  }

  return {
    seatedLeft: Math.max(0, seatedLeft),
    standingLeft: Math.max(0, standingLeft),
    seatedTotal: Math.max(0, seatedTotal),
    standingTotal: Math.max(0, standingTotal),
  };
};

const resolveTripBaseFare = (trip) => {
  const directFare = Number(trip?.fare ?? trip?.base_fare ?? trip?.fleet_route?.base_fare);
  if (Number.isFinite(directFare) && directFare > 0) return directFare;

  const fareRules = trip?.fleet_route?.fleet?.fare_rules || trip?.fleet_route?.fleet?.fareRules || [];
  const fares = fareRules
    .map((rule) => Number(rule?.base_fare))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (fares.length === 0) return null;
  return Math.min(...fares);
};

export default function BuyTicket({ onTicketPurchased }) {
  const [tripDetailsModal, setTripDetailsModal] = useState(null);
  const [ticketPreview, setTicketPreview] = useState(null);
  const [showDropoffModal, setShowDropoffModal] = useState(false);
  const [qrModalDismissedFor, setQrModalDismissedFor] = useState(null);
  const {
    availableRewardPoints,
    canProceedToOnlinePayment,
    checkoutStatus,
    destinationPinnedLabel,
    destinationQuery,
    dropoffMode,
    error,
    fare,
    hasFareQuote,
    form,
    formErrors,
    formatDateTime,
    grossTotal,
    handleChange,
    handleDestinationStopChange,
    handleDropoffModeChange,
    handleSubmit,
    handleTripSelect,
    hasRewardPoints,
    hasBookNowOption,
    isRewardRequestInsufficient,
    isGuestCheckout,
    isSubmitting,
    loading,
    loadingQr,
    loadingRewards,
    locatingDropoff,
    locatingOrigin,
    mapContainerRef,
    maxRedeemableRewardPoints,
    minBookingDate,
    netTotal,
    originPinnedLabel,
    pinCurrentLocationAsOrigin,
    printQrTicket,
    qrTickets,
    routeWarning,
    rewardPointsToApply,
    selectedRoute,
    selectedFleetType,
    selectedStops,
    selectedTrip,
    selectedTripIsToday,
    seatTypeOptions,
    seatTypePolicyNote,
    setDestinationQuery,
    stopLabel,
    success,
    showingSuggestedTrips,
    totalTickets,
    trips,
    unitFare,
    useCurrentLocationAsOrigin,
  } = useBuyTicket({ onTicketPurchased });

  // S1: "Your Ticket QR" opens in its own modal rather than sitting inline
  // in the page. Derived (not effect-driven) so dismissing the modal for
  // one purchase doesn't suppress it for a later one in the same session —
  // the "identity" of the current successful checkout is tracked via the
  // first ticket's uuid (falling back to a fixed key while QR is still
  // loading), and the modal reopens whenever that identity changes.
  const qrModalIdentity = checkoutStatus === 'success'
    ? (qrTickets[0]?.ticket_uuid || 'pending-qr')
    : null;
  const qrModalOpen = qrModalIdentity !== null && qrModalIdentity !== qrModalDismissedFor;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <section
        className="relative flex min-h-[190px] items-center overflow-hidden rounded-2xl bg-cover bg-center p-6 text-white"
        style={{ backgroundImage: `linear-gradient(rgba(9,25,52,0.55), rgba(9,25,52,0.65)), url(${heroBg})` }}
      >
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-400/25 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide ring-1 ring-inset ring-teal-200/40">
            Real-time trips active
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">Ride smarter, arrive on time.</h1>
          <p className="mt-2 max-w-md text-sm text-slate-200">Book your next trip with live seat availability and smart route visibility.</p>
        </div>
      </section>

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
            Complete the payment in the newly opened tab. This page will update with success or failure automatically.
          </p>
        </Card>
      )}

      {/* S1: "Your Ticket QR" as its own modal — shows the Group QR for a
          multi-ticket purchase, or the single ticket's own QR otherwise. */}
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
          // Group purchase — the Group QR is the primary artifact; a
          // conductor scans it once to board every ticket in this order.
          <div className="space-y-3">
            {qrTickets[0]?.group_qr_url ? (
              <div className="rounded-xl bg-teal-50 p-3 ring-1 ring-inset ring-teal-200">
                <p className="text-sm font-semibold text-teal-800">
                  Group Boarding QR — scan once to board all {qrTickets.length} tickets
                </p>
                <img
                  src={qrTickets[0].group_qr_url}
                  alt="Group boarding QR"
                  className="mt-2 h-40 w-40 rounded-lg"
                />
                <p className="mt-2 text-xs text-teal-700">
                  The conductor scans this QR to board all passengers in your order at once.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Group QR will appear on your scheduled trip date.</p>
            )}

            <div className="space-y-2">
              {qrTickets.map((ticket, idx) => (
                <div key={ticket.ticket_uuid || idx} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-semibold text-navy-950">
                      {selectedRoute?.origin || 'Ecoland Terminal'} to {selectedRoute?.destination || ticket.destination || 'Tagum Terminal'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {ticket.seat_type || 'seated'} · {formatDateTime(ticket.valid_from)}
                    </p>
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
          // Single-ticket purchase — show that ticket's own QR directly,
          // not a "group" QR for a transaction of one.
          <TicketCard
            fromLabel={qrTickets[0]?.origin || selectedRoute?.origin || 'Ecoland Terminal'}
            toLabel={qrTickets[0]?.destination || selectedRoute?.destination || 'Tagum Terminal'}
            departureLabel={formatDateTime(qrTickets[0]?.valid_from)}
            seatLabel={qrTickets[0]?.seat_type || '-'}
            routeLabel={`${qrTickets[0]?.origin || selectedRoute?.origin || '-'} to ${qrTickets[0]?.destination || selectedRoute?.destination || '-'}`}
            qrUrl={qrTickets[0]?.qr_url}
            statusLabel="Valid"
            validLabel={formatDateTime(qrTickets[0]?.valid_from)}
            expiresLabel={formatDateTime(qrTickets[0]?.expires_at)}
          />
        )}

        {qrTickets.length > 0 && (
          <div className="mt-4 flex justify-end gap-2">
            {qrTickets.length === 1 && (
              <Button type="button" variant="outline" size="sm" onClick={() => printQrTicket(qrTickets[0], 0)} disabled={!qrTickets[0]?.qr_url}>
                Print QR (PDF)
              </Button>
            )}
            <Button type="button" variant="primary" size="sm" onClick={() => setQrModalDismissedFor(qrModalIdentity)}>Close</Button>
          </div>
        )}
      </Modal>


      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-4">
          <h3 className="font-display text-base font-semibold text-navy-950">Book a Seat</h3>
          <p className="mt-1 text-xs text-slate-500">Sign in is required only for history and rewards.</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <input
              type="text"
              value={form.search_from || ''}
              onChange={(e) => handleChange('search_from', e.target.value)}
              placeholder="From (origin terminal)"
              className="min-h-9 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30"
            />

            <input
              type="text"
              list="destination-stop-list"
              value={form.search_to || (dropoffMode === 'custom' ? (destinationPinnedLabel || '') : destinationQuery)}
              onChange={(e) => {
                handleChange('search_to', e.target.value);
                if (dropoffMode === 'custom') return;
                const value = e.target.value;
                setDestinationQuery(value);
                if (dropoffMode === 'stop') {
                  const matched = selectedStops.find((stop) => stopLabel(stop).toLowerCase() === value.toLowerCase());
                  if (matched) handleChange('destination_stop_id', String(matched.stop_id));
                }
              }}
              readOnly={dropoffMode === 'custom'}
              placeholder={dropoffMode === 'stop' ? 'To (destination terminal)' : 'Pin destination on map below'}
              className="min-h-9 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30"
            />

            <input
              type="date"
              value={form.search_date || ''}
              onChange={(e) => handleChange('search_date', e.target.value)}
              className="min-h-9 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30"
            />

            <datalist id="destination-stop-list">
              {selectedStops.map((stop) => (
                <option key={`dest-${stop.stop_id}`} value={stopLabel(stop)} />
              ))}
            </datalist>

            <button
              type="button"
              onClick={useCurrentLocationAsOrigin}
              disabled={locatingOrigin || !selectedStops.length}
              className="min-h-9 whitespace-nowrap rounded-lg bg-navy-50 px-3 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {locatingOrigin ? 'Locating...' : 'Use Current'}
            </button>
          </div>
          {formErrors.trip_id && <p className="mt-2 text-xs text-red-600">{formErrors.trip_id}</p>}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-navy-950">Available Trips</h2>
            <span className="text-xs text-slate-500">{loading ? 'Loading...' : `${trips.length} trip(s) found`}</span>
          </div>

          {loading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Loader size={16} className="animate-spin" /> Loading available trips...</div>
          ) : trips.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No active trips available right now.</p>
          ) : (
            <>
              {showingSuggestedTrips && (
                <p className="mt-3 text-sm text-slate-500">
                  No exact trips found for the selected date. Showing the next available matching trips.
                </p>
              )}
              <div className="mt-3 space-y-2">
                {trips.map((trip) => {
                const checked = form.trip_id === String(trip.trip_id);
                const route = trip.fleet_route?.route || {};
                const fleet = trip.fleet_route?.fleet || {};
                const baseFare = resolveTripBaseFare(trip);
                const {
                  seatedLeft,
                  standingLeft,
                  seatedTotal,
                  standingTotal,
                } = toSeatAvailability(trip, fleet);
                const isFull = seatedLeft <= 0 && standingLeft <= 0;
                return (
                  <div
                    key={trip.trip_id}
                    role="button"
                    tabIndex={0}
                    className={`grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border p-3 transition ${
                      checked ? 'border-navy-700 bg-navy-50' : 'border-slate-200'
                    } ${isFull ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    onClick={() => !isFull && handleTripSelect(checked ? '' : String(trip.trip_id))}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isFull) handleTripSelect(checked ? '' : String(trip.trip_id)); }}
                    aria-pressed={checked}
                    aria-disabled={isFull}
                  >
                    {/* Route header */}
                    <div>
                      <h4 className="text-sm font-bold text-navy-950">
                        {route.origin || 'Origin'} &rarr; {route.destination || 'Destination'}
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {route.route_name || ''}
                      </p>
                      {/* Fleet sub-info */}
                      <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-slate-500">
                        {fleet.plate_number && <span>🚌 {fleet.plate_number}</span>}
                        {fleet.fleet_type && <span className="capitalize">{fleet.fleet_type}</span>}
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {getTripScheduleLabel(trip)}
                        </span>
                        <span className={`capitalize ${trip.status === 'boarding' ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {trip.status}
                        </span>
                      </div>
                    </div>

                    {/* Capacity + fare column */}
                    <div className="flex min-w-[100px] flex-col items-end gap-1">
                      {/* Fare */}
                      <strong className={`text-right text-sm ${checked && hasFareQuote ? 'text-emerald-600' : 'text-navy-950'}`}>
                        {checked && hasFareQuote
                          ? `PHP ${Number(fare).toFixed(2)}`
                          : (baseFare != null ? `From PHP ${Number(baseFare).toFixed(2)}` : 'Fare depends on drop-off')}
                      </strong>
                      <span className="text-right text-[0.7rem] text-slate-400">
                        {baseFare != null ? 'base fare per passenger' : 'select drop-off to quote exact price'}
                      </span>

                      {/* Seated capacity */}
                      <div className={`mt-1 flex items-center gap-1 text-xs ${seatedLeft > 0 ? 'text-sky-600' : 'text-red-500'}`}>
                        <Users size={11} />
                        <span>Seated: {seatedLeft}/{seatedTotal}</span>
                      </div>
                      {/* Standing capacity */}
                      <div className={`text-xs ${standingLeft > 0 ? 'text-slate-500' : 'text-red-500'}`}>
                        Standing: {standingLeft}/{standingTotal}
                      </div>

                      {isFull && (
                        <span className="text-[0.68rem] font-semibold text-red-500">FULL</span>
                      )}

                      {/* Trip info link */}
                      <button
                        type="button"
                        className="mt-1 text-[0.68rem] font-medium text-sky-600 underline"
                        onClick={(ev) => { ev.stopPropagation(); setTripDetailsModal(trip); }}
                      >
                        Trip info
                      </button>
                    </div>
                  </div>
                );
                })}
              </div>
            </>
          )}
        </Card>

        {selectedTrip && (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
            <Card className="p-4">
              <h2 className="font-display text-lg font-semibold text-navy-950">Seat and Payment</h2>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Seat Type</label>
                <div className="flex flex-wrap gap-2">
                  {seatTypeOptions.map((type) => (
                    <label key={type} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-navy-900">
                      <input
                        type="radio"
                        name="seat_type"
                        value={type}
                        checked={form.seat_type === type}
                        onChange={(e) => handleChange('seat_type', e.target.value)}
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
                {seatTypePolicyNote && <p className="mt-1.5 text-xs text-slate-500">{seatTypePolicyNote}</p>}
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Ticket Quantity</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  value={form.ticket_quantity}
                  onChange={(e) => handleChange('ticket_quantity', e.target.value)}
                  placeholder="Number of tickets"
                  className="min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30"
                />
                {formErrors.ticket_quantity && <p className="mt-1.5 text-xs text-red-600">{formErrors.ticket_quantity}</p>}
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Booking Option</label>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-navy-900">
                    <input
                      type="radio"
                      name="booking_option"
                      value="now"
                      checked={form.booking_option === 'now'}
                      onChange={(e) => handleChange('booking_option', e.target.value)}
                      disabled={!hasBookNowOption}
                    />
                    <span>Book Now</span>
                  </label>
                  <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-navy-900">
                    <input
                      type="radio"
                      name="booking_option"
                      value="later"
                      checked={form.booking_option === 'later'}
                      onChange={(e) => handleChange('booking_option', e.target.value)}
                      disabled={selectedTripIsToday}
                    />
                    <span>Book Later</span>
                  </label>
                </div>
                {selectedTripIsToday && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    This trip is scheduled for today, so only Book Now is available.
                  </p>
                )}
                {!hasBookNowOption && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    Book Now is unavailable because current trips are all future schedules.
                  </p>
                )}
                {form.booking_option === 'later' && !selectedTripIsToday && (
                  <input
                    type="date"
                    value={form.booking_date}
                    onChange={(e) => handleChange('booking_date', e.target.value)}
                    min={minBookingDate}
                    className="mt-2 min-h-9 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30"
                  />
                )}
                {formErrors.booking_date && <p className="mt-1.5 text-xs text-red-600">{formErrors.booking_date}</p>}
              </div>

              <div className="mt-4">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><CreditCard size={14} /> Payment</label>
                <div className="mb-2 text-sm text-slate-500">
                  Online booking is paid online by default.
                </div>
                {isGuestCheckout && (
                  <input
                    type="email"
                    value={form.guest_email}
                    onChange={(e) => handleChange('guest_email', e.target.value)}
                    placeholder="Email for receipt (optional)"
                    className="mb-2 min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30"
                  />
                )}

                <div role="radiogroup" aria-label="Payment method" className="mt-2 grid grid-cols-3 gap-2">
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
                          isSelected
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <channel.icon className="h-4 w-4" />
                        {channel.label}
                      </button>
                    );
                  })}
                </div>

                {!isGuestCheckout && (
                  <>
                    <div className="mt-2 text-sm text-slate-500">
                      {loadingRewards
                        ? 'Loading reward balance...'
                        : `Available Rewards: ${Number(availableRewardPoints || 0).toFixed(0)} RP`}
                    </div>

                    <Toggle
                      checked={Boolean(form.use_rewards)}
                      onChange={(checked) => handleChange('use_rewards', checked)}
                      disabled={!hasRewardPoints}
                      label="Use reward points"
                      description={
                        !hasRewardPoints && !loadingRewards
                          ? "Disabled — you don't have any reward points to redeem yet. Earn points by completing paid trips."
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
                          className="mt-2 min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30"
                        />
                        <div className={`mt-1.5 text-xs ${isRewardRequestInsufficient ? 'text-red-600' : 'text-slate-500'}`}>
                          Max usable now: {Number(maxRedeemableRewardPoints || 0).toFixed(0)} RP
                          {isRewardRequestInsufficient ? ' (insufficient for requested amount)' : ''}
                        </div>
                        {formErrors.reward_points_to_use && (
                          <div className="mt-1 text-xs text-red-600">{formErrors.reward_points_to_use}</div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              <div className="mt-4 space-y-3">
                <label className="block text-xs font-semibold text-slate-600">
                  Drop-off Mode
                  <select
                    value={dropoffMode}
                    onChange={(e) => handleDropoffModeChange(e.target.value)}
                    className="mt-1.5 min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30"
                  >
                    <option value="stop">Route Stop</option>
                    <option value="custom">Custom Drop-off (Coordinates)</option>
                  </select>
                </label>

                <label className="block text-xs font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1"><MapPin size={14} /> Origin Stop</span>
                  <select
                    value={form.origin_stop_id}
                    onChange={(e) => handleChange('origin_stop_id', e.target.value)}
                    className="mt-1.5 min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30"
                  >
                    <option value="">Select origin stop...</option>
                    {selectedStops.map((stop) => (
                      <option key={`origin-select-${stop.stop_id}`} value={stop.stop_id}>{stopLabel(stop)}</option>
                    ))}
                  </select>
                </label>

                {dropoffMode === 'stop' ? (
                  <label className="block text-xs font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1"><MapPin size={14} /> Destination Stop</span>
                    <select
                      value={form.destination_stop_id}
                      onChange={(e) => handleDestinationStopChange(e.target.value)}
                      className="mt-1.5 min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30"
                    >
                      <option value="">Select destination stop...</option>
                      {selectedStops.map((stop) => (
                        <option key={`dest-select-${stop.stop_id}`} value={stop.stop_id}>{stopLabel(stop)}</option>
                      ))}
                    </select>
                    {formErrors.destination_stop_id && <p className="mt-1.5 text-xs text-red-600">{formErrors.destination_stop_id}</p>}
                  </label>
                ) : (
                  <>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <span className="block text-xs font-semibold text-slate-500">Pinned Origin</span>
                      <strong className="mt-0.5 block text-sm text-navy-950">{originPinnedLabel || 'Origin pin will appear once stop is selected or located'}</strong>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <span className="block text-xs font-semibold text-slate-500">Pinned Destination</span>
                      <strong className="mt-0.5 block text-sm text-navy-950">{destinationPinnedLabel || 'No location pinned yet'}</strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDropoffModal(true)}
                      className="mt-2 flex items-center gap-2 rounded-lg border border-navy-800 px-3 py-2 text-xs font-semibold text-navy-800 transition hover:bg-navy-50"
                    >
                      <MapPin size={14} />
                      Pin drop-off on map
                    </button>
                    {formErrors.destination_lat && <p className="mt-1.5 text-xs text-red-600">{formErrors.destination_lat}</p>}
                  </>
                )}
                {formErrors.origin_stop_id && <p className="text-xs text-red-600">{formErrors.origin_stop_id}</p>}
                {routeWarning && <p className="text-xs text-amber-600">{routeWarning}</p>}
                {formErrors.payment && <p className="text-xs text-red-600">{formErrors.payment}</p>}
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="font-display text-lg font-semibold text-navy-950">Booking Summary</h2>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5"><span className="text-xs text-slate-500">Route</span><strong className="text-sm text-navy-950">{selectedRoute?.origin || '-'} to {selectedRoute?.destination || '-'}</strong></div>
                <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5"><span className="text-xs text-slate-500">Seat Type</span><strong className="text-sm text-navy-950">{form.seat_type}</strong></div>
                <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5"><span className="text-xs text-slate-500">Destination</span><strong className="text-sm text-navy-950">{selectedRoute?.destination || 'Destination'}</strong></div>
                <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5"><span className="text-xs text-slate-500">Payment</span><strong className="text-sm text-navy-950">Online payment</strong></div>
                <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5"><span className="text-xs text-slate-500">Unit Fare</span><strong className="text-sm text-navy-950">PHP {hasFareQuote ? Number(unitFare).toFixed(2) : '0.00'}</strong></div>
                <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5"><span className="text-xs text-slate-500">Quantity</span><strong className="text-sm text-navy-950">{totalTickets}</strong></div>
                <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5"><span className="text-xs text-slate-500">Booking</span><strong className="text-sm text-navy-950">{form.booking_option === 'later' ? `Later (${form.booking_date || '-'})` : 'Now (Today)'}</strong></div>
                <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5"><span className="text-xs text-slate-500">Gross Total</span><strong className="text-sm text-navy-950">PHP {Number(grossTotal || 0).toFixed(2)}</strong></div>
                <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5"><span className="text-xs text-slate-500">Rewards Applied</span><strong className="text-sm text-navy-950">{Number(rewardPointsToApply || 0).toFixed(0)} RP</strong></div>
                <div className="flex justify-between gap-2"><span className="text-xs text-slate-500">Net Total</span><strong className="text-sm text-navy-950">PHP {Number(netTotal || 0).toFixed(2)}</strong></div>
              </div>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !form.origin_stop_id ||
                  !form.ticket_quantity ||
                  (dropoffMode === 'stop'
                    ? !form.destination_stop_id
                    : (!form.destination_lat || !form.destination_lng)) ||
                  (form.payment_method === 'online' && !canProceedToOnlinePayment) ||
                  isRewardRequestInsufficient
                }
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
      </form>

      {/* Custom drop-off map modal. Mounted whenever dropoffMode === 'custom'
          (matching the same condition useDropoffPicker's map-init effect
          checks) so the MapLibre instance's lifecycle is never disturbed by
          opening/closing this modal — only *visibility* is toggled here via
          Tailwind's visible/invisible utilities (which preserve layout size,
          unlike display:none/conditional mounting) so the map keeps a real
          width/height to size its canvas against. */}
      {dropoffMode === 'custom' && (
        <div
          role="presentation"
          onClick={() => setShowDropoffModal(false)}
          className={`fixed inset-0 z-1200 flex items-center justify-center bg-black/60 p-4 transition-opacity ${
            showDropoffModal ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'
          }`}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Pin drop-off on map"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-display text-base font-semibold text-navy-950">Pin Drop-off on Map</h3>
              <button
                type="button"
                onClick={() => setShowDropoffModal(false)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
              >
                Done
              </button>
            </div>

            <button
              type="button"
              onClick={pinCurrentLocationAsOrigin}
              disabled={locatingDropoff}
              className="mb-3 flex items-center gap-2 rounded-lg border border-navy-800 px-3 py-2 text-xs font-semibold text-navy-800 transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LocateFixed size={14} />
              {locatingDropoff ? 'Locating Origin...' : 'Pin My Current Location as Origin'}
            </button>

            <p className="mb-2 text-xs text-slate-500">Click the map to set the drop-off coordinates.</p>
            <div ref={mapContainerRef} className="h-80 w-full overflow-hidden rounded-xl" />
            {formErrors.destination_lat && <p className="mt-2 text-xs text-red-600">{formErrors.destination_lat}</p>}

            <dl className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Pinned Origin</dt>
                <dd className="text-right font-medium text-navy-950">{originPinnedLabel || 'Not pinned yet'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Pinned Destination</dt>
                <dd className="text-right font-medium text-navy-950">{destinationPinnedLabel || 'Not pinned yet'}</dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      <Modal open={Boolean(ticketPreview?.ticket)} onClose={() => setTicketPreview(null)} title="Ticket Details">
        {ticketPreview?.ticket && (
          <>
            <div className="mb-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => printQrTicket(ticketPreview.ticket, ticketPreview.idx)}
                disabled={!ticketPreview.ticket.qr_url}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
              >
                Print PDF
              </button>
            </div>

            <TicketCard
              fromLabel={ticketPreview.ticket.origin || selectedRoute?.origin || 'Ecoland Terminal'}
              toLabel={ticketPreview.ticket.destination || selectedRoute?.destination || 'Tagum Terminal'}
              departureLabel={formatDateTime(ticketPreview.ticket.valid_from)}
              seatLabel={ticketPreview.ticket.seat_type || '-'}
              routeLabel={`${ticketPreview.ticket.origin || selectedRoute?.origin || '-'} to ${ticketPreview.ticket.destination || selectedRoute?.destination || '-'}`}
              qrUrl={ticketPreview.ticket.qr_url}
              statusLabel="Valid"
              amountLabel={`PHP ${Number(ticketPreview.ticket.amount || 0).toFixed(2)}`}
              validLabel={formatDateTime(ticketPreview.ticket.valid_from)}
              expiresLabel={formatDateTime(ticketPreview.ticket.expires_at)}
            />
          </>
        )}
      </Modal>

      {/* ── Trip Details Modal (Suggestion) ─────────────────────────────── */}
      <Modal
        open={Boolean(tripDetailsModal)}
        onClose={() => setTripDetailsModal(null)}
        title={tripDetailsModal ? `${tripDetailsModal.fleet_route?.route?.origin || '—'} → ${tripDetailsModal.fleet_route?.route?.destination || '—'}` : undefined}
      >
        {tripDetailsModal && (() => {
          const td = tripDetailsModal;
          const route = td.fleet_route?.route || {};
          const fleet = td.fleet_route?.fleet || {};
          const {
            seatedLeft,
            standingLeft,
            seatedTotal,
            standingTotal,
          } = toSeatAvailability(td, fleet);
          return (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              {[
                ['Route', route.route_name || '—'],
                ['Schedule', getTripScheduleLabel(td)],
                ['Status', td.status],
                ['Fleet', fleet.plate_number || '—'],
                ['Fleet type', fleet.fleet_type || '—'],
                ['Seated capacity', seatedTotal],
                ['Standing capacity', standingTotal],
                ['Seated available', seatedLeft],
                ['Standing available', standingLeft],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="mb-0.5 text-xs text-slate-400">{k}</dt>
                  <dd className="font-semibold capitalize text-navy-950">{String(v)}</dd>
                </div>
              ))}
            </dl>
          );
        })()}
      </Modal>
    </div>
  );
}

