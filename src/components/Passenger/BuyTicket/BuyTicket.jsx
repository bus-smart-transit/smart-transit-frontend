import { useState } from 'react';
import { MapPin, Clock, Smartphone, CreditCard, AlertCircle, CheckCircle, Loader, LocateFixed, Users } from 'lucide-react';
import useBuyTicket from '../../../api/hooks/Passenger/useBuyTicket';
import TicketCard from '../Ticket/TicketCard';
import './BuyTicketPortal.css';

const toCompactTime = (value) => {
  if (!value) return '';
  const str = String(value).trim();
  const hhmmss = str.match(/^(\d{2}:\d{2})(?::\d{2})?$/);
  if (hhmmss) return hhmmss[1];
  return str;
};

const toDateLabel = (value) => {
  if (!value) return '-';
  const str = String(value);
  const dateOnlyMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnlyMatch) {
    return `${dateOnlyMatch[1]}/${dateOnlyMatch[2]}/${dateOnlyMatch[3]}`;
  }

  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return '-';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;
};

const getTripScheduleLabel = (trip) => {
  const dateLabel = toDateLabel(trip?.trip_date);
  const startTime = toCompactTime(trip?.fleet_route?.start_time);
  const endTime = toCompactTime(trip?.fleet_route?.end_time);

  if (startTime && endTime) return `${dateLabel} ${startTime}-${endTime}`;
  if (startTime) return `${dateLabel} ${startTime}`;
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

export default function BuyTicket({ onTicketPurchased }) {
  const [tripDetailsModal, setTripDetailsModal] = useState(null);
  const {
    availableRewardPoints,
    canProceedToOnlinePayment,
    checkoutStatus,
    destinationPinnedLabel,
    destinationQuery,
    dropoffMode,
    error,
    fare,
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

  return (
    <div className="buy-portal">
      <section className="buy-hero">
        <div>
          <span className="buy-tag">Real-time trips active</span>
          <h1>Ride smarter, arrive on time.</h1>
          <p>Book your next trip with live seat availability and smart route visibility.</p>
        </div>
      </section>

      {error && (
        <div className="buy-alert error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="buy-alert success">
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {checkoutStatus === 'pending' && (
        <section className="buy-panel" style={{ marginBottom: '16px' }}>
          <div className="buy-panel-head">
            <h2>Checkout in Progress</h2>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Complete the payment in the newly opened tab. This page will update with success or failure automatically.
          </p>
        </section>
      )}

      {checkoutStatus === 'success' && (
        <section className="buy-panel" style={{ marginBottom: '16px' }}>
          <div className="buy-panel-head">
            <h2>Your Ticket QR</h2>
          </div>

          {loadingQr ? (
            <div className="buy-loading"><Loader size={16} /> Loading ticket QR...</div>
          ) : qrTickets.length === 0 ? (
            <p className="buy-empty">Payment succeeded. Ticket QR will appear on your scheduled trip date.</p>
          ) : (
            <div className="buy-trip-list">
              {/* Group QR — shown once when the order has more than one ticket */}
              {qrTickets.length > 1 && qrTickets[0]?.group_qr_url && (
                <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid rgba(99,179,237,0.3)', borderRadius: '12px', background: 'rgba(14,165,233,0.06)' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 600, color: '#7dd3fc' }}>
                    Group Boarding QR — scan once to board all {qrTickets.length} tickets
                  </p>
                  <img
                    src={qrTickets[0].group_qr_url}
                    alt="Group boarding QR"
                    style={{ width: '160px', height: '160px', borderRadius: '8px', display: 'block' }}
                  />
                  <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>
                    The conductor scans this QR to board all passengers in your order at once.
                  </p>
                </div>
              )}

              {qrTickets.map((ticket, idx) => (
                <div key={ticket.ticket_uuid || idx}>
                  <TicketCard
                    fromLabel={selectedRoute?.origin || 'Ecoland Terminal'}
                    toLabel={selectedRoute?.destination || ticket.destination || 'Tagum Terminal'}
                    departureLabel={formatDateTime(ticket.valid_from)}
                    seatLabel={ticket.seat_type || '-'}
                    routeLabel={`${selectedRoute?.origin || '-'} to ${selectedRoute?.destination || ticket.destination || '-'}`}
                    qrUrl={ticket.qr_url}
                    statusLabel="Valid"
                    amountLabel={`PHP ${Number(ticket.amount || 0).toFixed(2)}`}
                    validLabel={formatDateTime(ticket.valid_from)}
                    expiresLabel={formatDateTime(ticket.expires_at)}
                  />
                  <button
                    type="button"
                    onClick={() => printQrTicket(ticket, idx)}
                    disabled={!ticket.qr_url}
                    style={{
                      marginTop: '8px',
                      border: '1px solid rgba(148,163,184,0.4)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '0.75rem',
                      color: ticket.qr_url ? '#e2e8f0' : '#64748b',
                      background: ticket.qr_url ? 'rgba(15,23,42,0.5)' : 'rgba(30,41,59,0.3)',
                      cursor: ticket.qr_url ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Print QR (PDF)
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <form onSubmit={handleSubmit} className="buy-form">
        <section className="buy-search-card">
          <h3>Book a Seat</h3>
          <p>Sign in is required only for history and rewards.</p>
          <div className="buy-fields-row">
            <input
              type="text"
              value={form.search_from || ''}
              onChange={(e) => handleChange('search_from', e.target.value)}
              placeholder="From (origin terminal)"
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
            />

            <input
              type="date"
              value={form.search_date || ''}
              onChange={(e) => handleChange('search_date', e.target.value)}
            />

            <datalist id="destination-stop-list">
              {selectedStops.map((stop) => (
                <option key={`dest-${stop.stop_id}`} value={stopLabel(stop)} />
              ))}
            </datalist>

            <button type="button" onClick={useCurrentLocationAsOrigin} disabled={locatingOrigin || !selectedStops.length}>
              {locatingOrigin ? 'Locating...' : 'Use Current'}
            </button>
          </div>
          {formErrors.trip_id && <p style={{ color: '#fca5a5', marginTop: '8px', fontSize: '0.8rem' }}>{formErrors.trip_id}</p>}
        </section>

        <section className="buy-panel">
          <div className="buy-panel-head">
            <h2>Available Trips</h2>
            <span>{loading ? 'Loading...' : `${trips.length} trip(s) found`}</span>
          </div>

          {loading ? (
            <div className="buy-loading"><Loader size={16} /> Loading available trips...</div>
          ) : trips.length === 0 ? (
            <p className="buy-empty">No active trips available right now.</p>
          ) : (
            <>
              {showingSuggestedTrips && (
                <p className="buy-empty" style={{ marginBottom: '8px' }}>
                  No exact trips found for the selected date. Showing the next available matching trips.
                </p>
              )}
              <div className="buy-trip-list">
                {trips.map((trip) => {
                const checked = form.trip_id === String(trip.trip_id);
                const route = trip.fleet_route?.route || {};
                const fleet = trip.fleet_route?.fleet || {};
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
                    className={`buy-trip-card ${checked ? 'active' : ''} ${isFull ? 'full' : ''}`}
                    onClick={() => !isFull && handleTripSelect(checked ? '' : String(trip.trip_id))}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isFull) handleTripSelect(checked ? '' : String(trip.trip_id)); }}
                    aria-pressed={checked}
                    aria-disabled={isFull}
                    style={{ cursor: isFull ? 'not-allowed' : 'pointer', opacity: isFull ? 0.6 : 1 }}
                  >
                    {/* Route header */}
                    <div className="buy-trip-main">
                      <h4 style={{ marginBottom: '2px', fontSize: '1rem', fontWeight: 700 }}>
                        {route.origin || 'Origin'} &rarr; {route.destination || 'Destination'}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                        {route.route_name || ''}
                      </p>
                      {/* Fleet sub-info */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                        {fleet.plate_number && <span>🚌 {fleet.plate_number}</span>}
                        {fleet.fleet_type  && <span style={{ textTransform: 'capitalize' }}>{fleet.fleet_type}</span>}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={11} /> {getTripScheduleLabel(trip)}
                        </span>
                        <span style={{ textTransform: 'capitalize', color: trip.status === 'boarding' ? '#22c55e' : '#64748b' }}>
                          {trip.status}
                        </span>
                      </div>
                    </div>

                    {/* Capacity + fare column */}
                    <div className="buy-trip-side" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', minWidth: '100px' }}>
                      {/* Fare */}
                      <strong style={{ fontSize: '1rem', color: checked && fare ? '#34d399' : '#e2e8f0' }}>
                        {checked && fare ? `PHP ${fare.toFixed(2)}` : 'See fare ↓'}
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>per passenger</span>

                      {/* Seated capacity */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '0.72rem', color: seatedLeft > 0 ? '#38bdf8' : '#ef4444' }}>
                        <Users size={11} />
                        <span>Seated: {seatedLeft}/{seatedTotal}</span>
                      </div>
                      {/* Standing capacity */}
                      <div style={{ fontSize: '0.72rem', color: standingLeft > 0 ? '#94a3b8' : '#ef4444' }}>
                        Standing: {standingLeft}/{standingTotal}
                      </div>

                      {isFull && (
                        <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 600 }}>FULL</span>
                      )}

                      {/* Trip info link */}
                      <button
                        type="button"
                        style={{ marginTop: '4px', fontSize: '0.68rem', color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
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
        </section>

        {selectedTrip && (
          <section className="buy-grid-two">
            <article className="buy-panel">
              <div className="buy-panel-head">
                <h2>Seat and Payment</h2>
              </div>

              <div className="buy-inline-group">
                <label>Seat Type</label>
                <div className="buy-toggle-row">
                  {seatTypeOptions.map((type) => (
                    <label key={type}>
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
                {seatTypePolicyNote && <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '0.78rem' }}>{seatTypePolicyNote}</p>}
              </div>

              <div className="buy-inline-group">
                <label>Ticket Quantity</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  value={form.ticket_quantity}
                  onChange={(e) => handleChange('ticket_quantity', e.target.value)}
                  placeholder="Number of tickets"
                />
                {formErrors.ticket_quantity && <p style={{ color: '#fca5a5', marginTop: '6px', fontSize: '0.78rem' }}>{formErrors.ticket_quantity}</p>}
              </div>

              <div className="buy-inline-group">
                <label>Booking Option</label>
                <div className="buy-toggle-row">
                  <label>
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
                  <label>
                    <input
                      type="radio"
                      name="booking_option"
                      value="later"
                      checked={form.booking_option === 'later'}
                      onChange={(e) => handleChange('booking_option', e.target.value)}
                    />
                    <span>Book Later</span>
                  </label>
                </div>
                {!hasBookNowOption && (
                  <p style={{ color: '#f59e0b', marginTop: '6px', fontSize: '0.78rem' }}>
                    Book Now is unavailable because current trips are all future schedules.
                  </p>
                )}
                {form.booking_option === 'later' && (
                  <input
                    type="date"
                    value={form.booking_date}
                    onChange={(e) => handleChange('booking_date', e.target.value)}
                    min={minBookingDate}
                  />
                )}
                {formErrors.booking_date && <p style={{ color: '#fca5a5', marginTop: '6px', fontSize: '0.78rem' }}>{formErrors.booking_date}</p>}
              </div>

              <div className="buy-inline-group">
                <label><Smartphone size={14} /> Payment Method</label>
                <div className="buy-toggle-row">
                  <label>
                    <input
                      type="radio"
                      name="payment_method"
                      value="online"
                      checked={form.payment_method === 'online'}
                      onChange={(e) => handleChange('payment_method', e.target.value)}
                    />
                    <span>Online</span>
                  </label>
                  <label className="disabled">
                    <input type="radio" name="payment_method" value="onsite" disabled />
                    <span>Onsite</span>
                  </label>
                </div>
              </div>

              {form.payment_method === 'online' && (
                <div className="buy-inline-group">
                  <label>Payment Channel</label>
                  <div className="buy-toggle-row">
                    {['gcash', 'maya', 'card'].map((channel) => (
                      <label key={channel}>
                        <input
                          type="radio"
                          name="payment_channel"
                          value={channel}
                          checked={form.payment_channel === channel}
                          onChange={(e) => handleChange('payment_channel', e.target.value)}
                        />
                        <span>{channel}</span>
                      </label>
                    ))}
                  </div>
                  {isGuestCheckout && (
                    <input
                      type="email"
                      value={form.guest_email}
                      onChange={(e) => handleChange('guest_email', e.target.value)}
                      placeholder="Email for receipt (optional)"
                    />
                  )}
                  {!isGuestCheckout && (
                    <>
                      <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '6px' }}>
                        {loadingRewards
                          ? 'Loading reward balance...'
                          : `Available Rewards: ${Number(availableRewardPoints || 0).toFixed(0)} RP`}
                      </div>

                      <label style={{ marginTop: '8px' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(form.use_rewards)}
                          onChange={(e) => handleChange('use_rewards', e.target.checked)}
                          disabled={!hasRewardPoints}
                        />
                        <span> Use reward points</span>
                      </label>

                      {form.use_rewards && (
                        <>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={form.reward_points_to_use}
                            onChange={(e) => handleChange('reward_points_to_use', e.target.value)}
                            placeholder="Reward points to use"
                          />
                          <div style={{ color: isRewardRequestInsufficient ? '#fca5a5' : '#93c5fd', fontSize: '0.78rem' }}>
                            Max usable now: {Number(maxRedeemableRewardPoints || 0).toFixed(0)} RP
                            {isRewardRequestInsufficient ? ' (insufficient for requested amount)' : ''}
                          </div>
                          {formErrors.reward_points_to_use && (
                            <div style={{ color: '#fca5a5', fontSize: '0.78rem' }}>{formErrors.reward_points_to_use}</div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="buy-stop-selectors">
                <label>
                  Drop-off Mode
                  <select
                    value={dropoffMode}
                    onChange={(e) => handleDropoffModeChange(e.target.value)}
                  >
                    <option value="stop">Route Stop</option>
                    <option value="custom">Custom Drop-off (Coordinates)</option>
                  </select>
                </label>

                <label>
                  <MapPin size={14} /> Origin Stop
                  <select
                    value={form.origin_stop_id}
                    onChange={(e) => handleChange('origin_stop_id', e.target.value)}
                  >
                    <option value="">Select origin stop...</option>
                    {selectedStops.map((stop) => (
                      <option key={`origin-select-${stop.stop_id}`} value={stop.stop_id}>{stopLabel(stop)}</option>
                    ))}
                  </select>
                </label>

                {dropoffMode === 'stop' ? (
                  <label>
                    <MapPin size={14} /> Destination Stop
                    <select
                      value={form.destination_stop_id}
                      onChange={(e) => handleDestinationStopChange(e.target.value)}
                    >
                      <option value="">Select destination stop...</option>
                      {selectedStops.map((stop) => (
                        <option key={`dest-select-${stop.stop_id}`} value={stop.stop_id}>{stopLabel(stop)}</option>
                      ))}
                    </select>
                    {formErrors.destination_stop_id && <p style={{ color: '#fca5a5', marginTop: '6px', fontSize: '0.78rem' }}>{formErrors.destination_stop_id}</p>}
                  </label>
                ) : (
                  <>
                    <div className="buy-pinned-location-display">
                      <span>Pinned Origin</span>
                      <strong>{originPinnedLabel || 'Origin pin will appear once stop is selected or located'}</strong>
                    </div>

                    <div className="buy-pinned-location-display">
                      <span>Pinned Destination</span>
                      <strong>{destinationPinnedLabel || 'No location pinned yet'}</strong>
                    </div>

                    <div className="buy-custom-dropoff-tools">
                      <button
                        type="button"
                        className="buy-inline-location-btn"
                        onClick={pinCurrentLocationAsOrigin}
                        disabled={locatingDropoff}
                      >
                        <LocateFixed size={14} />
                        {locatingDropoff ? 'Locating Origin...' : 'Pin My Current Location as Origin'}
                      </button>

                      <div className="buy-dropoff-map-wrap">
                        <div className="buy-dropoff-map-head">
                          <strong>Pin Drop-off on Map</strong>
                          <span>Click map to fill coordinates</span>
                        </div>
                        <div ref={mapContainerRef} className="buy-dropoff-map" />
                        {formErrors.destination_lat && <p style={{ color: '#fca5a5', marginTop: '6px', fontSize: '0.78rem' }}>{formErrors.destination_lat}</p>}
                      </div>
                    </div>
                  </>
                )}
                {formErrors.origin_stop_id && <p style={{ color: '#fca5a5', marginTop: '8px', fontSize: '0.78rem' }}>{formErrors.origin_stop_id}</p>}
                {routeWarning && <p style={{ color: '#f59e0b', marginTop: '8px', fontSize: '0.78rem' }}>{routeWarning}</p>}
                {formErrors.payment && <p style={{ color: '#fca5a5', marginTop: '8px', fontSize: '0.78rem' }}>{formErrors.payment}</p>}
              </div>
            </article>

            <article className="buy-panel buy-summary">
              <div className="buy-panel-head">
                <h2>Booking Summary</h2>
              </div>
              <div className="buy-summary-grid">
                <div><span>Route</span><strong>{selectedRoute?.origin || '-'} to {selectedRoute?.destination || '-'}</strong></div>
                <div><span>Seat Type</span><strong>{form.seat_type}</strong></div>
                <div><span>Fleet Type</span><strong style={{ textTransform: 'capitalize' }}>{selectedFleetType || 'public'}</strong></div>
                <div><span>Payment</span><strong>{form.payment_channel}</strong></div>
                <div><span>Unit Fare</span><strong>PHP {fare ? Number(unitFare).toFixed(2) : '0.00'}</strong></div>
                <div><span>Quantity</span><strong>{totalTickets}</strong></div>
                <div><span>Booking</span><strong>{form.booking_option === 'later' ? `Later (${form.booking_date || '-'})` : 'Now (Today)'}</strong></div>
                <div><span>Gross Total</span><strong>PHP {Number(grossTotal || 0).toFixed(2)}</strong></div>
                <div><span>Rewards Applied</span><strong>{Number(rewardPointsToApply || 0).toFixed(0)} RP</strong></div>
                <div><span>Net Total</span><strong>PHP {Number(netTotal || 0).toFixed(2)}</strong></div>
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
                className="buy-submit"
              >
                {isSubmitting ? (
                  <><Loader size={14} /> Processing...</>
                ) : (
                  <><CreditCard size={14} /> Continue to Payment</>
                )}
              </button>
            </article>
          </section>
        )}
      </form>

      {/* ── Trip Details Modal (Suggestion) ─────────────────────────────── */}
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
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
            role="presentation"
            onClick={() => setTripDetailsModal(null)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-label="Trip details"
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px', color: '#e2e8f0' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                  {route.origin || '—'} → {route.destination || '—'}
                </h3>
                <button type="button" onClick={() => setTripDetailsModal(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
              </div>

              <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 0', fontSize: '0.82rem' }}>
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
                    <dt style={{ color: '#64748b', marginBottom: '2px' }}>{k}</dt>
                    <dd style={{ margin: 0, fontWeight: 600, textTransform: 'capitalize' }}>{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        );
      })()}
    </div>
  );
}
