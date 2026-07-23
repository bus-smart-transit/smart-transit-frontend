import { MapPin, Clock, Smartphone, CreditCard, AlertCircle, CheckCircle, Loader, LocateFixed } from 'lucide-react';
import useBuyTicket from '../../../api/hooks/Passenger/useBuyTicket';
import TicketCard from '../Ticket/TicketCard';
import './BuyTicketPortal.css';

export default function BuyTicket({ onTicketPurchased }) {
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
    selectedStops,
    selectedTrip,
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
              placeholder="From"
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
              placeholder={dropoffMode === 'stop' ? 'To' : 'Pin destination on map below'}
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

            <select
              value={form.trip_id}
              onChange={(e) => handleTripSelect(e.target.value)}
            >
              <option value="">Select Trip</option>
              {trips.map((trip) => (
                <option key={trip.trip_id} value={trip.trip_id}>
                  {(trip.fleet_route?.fleet?.plate_number ? `Fleet ${trip.fleet_route.fleet.plate_number}` : `Fleet ${trip.fleet_route?.fleet_id || '-'}`)}
                  {` • ${trip.fleet_route?.route?.origin || '-'} to ${trip.fleet_route?.route?.destination || '-'}`}
                </option>
              ))}
            </select>

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
                {trips.map((trip, idx) => {
                const checked = form.trip_id === String(trip.trip_id);
                const fleetLabel = trip.fleet_route?.fleet?.plate_number
                  ? `Fleet ${trip.fleet_route.fleet.plate_number}`
                  : `Fleet ${trip.fleet_route?.fleet_id || '-'}`;
                return (
                  <label key={trip.trip_id} className={`buy-trip-card ${checked ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="trip"
                      value={trip.trip_id}
                      checked={checked}
                      onChange={(e) => handleTripSelect(e.target.value)}
                    />
                    <div className="buy-trip-main">
                      <h4>{idx + 1}. {fleetLabel}</h4>
                      <p><Clock size={13} /> {formatDateTime(trip.trip_date)} • {trip.fleet_route?.route?.origin || '-'} to {trip.fleet_route?.route?.destination || '-'} • Status: {trip.status}</p>
                    </div>
                    <div className="buy-trip-side">
                      <strong>PHP {fare ? fare.toFixed(2) : '50.00'}</strong>
                      <span>per passenger</span>
                    </div>
                  </label>
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
                  {['seated', 'standing'].map((type) => (
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
    </div>
  );
}
