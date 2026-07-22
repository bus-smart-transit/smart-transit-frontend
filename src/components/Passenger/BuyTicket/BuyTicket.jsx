import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, MapPin, Clock, Smartphone, CreditCard, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import PassengerService from '../../../api/PassengerService/PassengerService';
import './BuyTicketPortal.css';

export default function BuyTicket({ onTicketPurchased }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fare, setFare] = useState(null);
  const [fareQuoteKey, setFareQuoteKey] = useState('');
  const [locatingOrigin, setLocatingOrigin] = useState(false);
  const [destinationQuery, setDestinationQuery] = useState('');
  const [isGuestCheckout] = useState(() => !(localStorage.getItem('passenger_token') || sessionStorage.getItem('passenger_token')));

  const [form, setForm] = useState({
    trip_id: '',
    seat_type: 'seated',
    payment_method: 'online',
    payment_channel: 'gcash',
    guest_email: '',
    origin_stop_id: '',
    destination_stop_id: '',
  });

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await PassengerService.getAvailableTrips();
      setTrips(res?.data ?? []);
    } catch (err) {
      setError(err.message || 'Failed to load available trips');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTrips();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadTrips]);

  const handleChange = (field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      if (!form.trip_id) {
        throw new Error('Please select a trip');
      }
      if (!form.origin_stop_id || !form.destination_stop_id) {
        throw new Error('Please select origin and destination stops');
      }
      if (form.payment_method === 'online' && !canProceedToOnlinePayment) {
        throw new Error('Please get a valid fare quote first before proceeding to online payment');
      }

      const payload = {
        items: [
          {
            trip_id: parseInt(form.trip_id),
            seat_type: form.seat_type,
            origin_stop_id: parseInt(form.origin_stop_id),
            destination_stop_id: parseInt(form.destination_stop_id),
          },
        ],
      };

      if (form.payment_method === 'online') {
        if (isGuestCheckout && !form.guest_email) {
          throw new Error('Guest email is required for checkout');
        }
        payload.payment_channel = form.payment_channel;
        if (isGuestCheckout) payload.guest_email = form.guest_email;
        const res = await PassengerService.checkoutOnline(payload);
        const checkoutUrl =
          res?.data?.checkout_url ||
          res?.checkout_url ||
          null;

        if (!checkoutUrl) {
          throw new Error('Checkout URL was not returned by the payment gateway. Please try again.');
        }

        setSuccess('Redirecting to secure checkout...');
        onTicketPurchased?.();
        window.location.assign(checkoutUrl);
        return;
      } else {
        setError('Onsite checkout is only available at the terminal with a conductor');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTrip = trips.find(t => t.trip_id === parseInt(form.trip_id));
  const selectedRoute = selectedTrip?.fleet_route?.route || null;
  const selectedStops = selectedRoute?.routeStops || selectedRoute?.route_stops || [];
  const currentFareQuoteKey = [
    form.trip_id,
    selectedRoute?.route_id || '',
    selectedTrip?.fleet_route?.fleet_id || '',
    form.origin_stop_id,
    form.destination_stop_id,
    form.seat_type,
  ].join('|');
  const canProceedToOnlinePayment = fare != null && fareQuoteKey === currentFareQuoteKey;

  const stopLabel = (stop) => stop?.stop?.stop_name || stop?.stop_name || `Stop ${stop?.stop_id}`;

  const findNearestStop = (lat, lng, stops) => {
    const withCoords = stops
      .map((s) => {
        const sLat = Number(s?.stop?.latitude ?? s?.latitude);
        const sLng = Number(s?.stop?.longitude ?? s?.longitude);
        return Number.isFinite(sLat) && Number.isFinite(sLng)
          ? { stop: s, lat: sLat, lng: sLng }
          : null;
      })
      .filter(Boolean);

    if (withCoords.length === 0) return null;

    let nearest = withCoords[0];
    let minDist = Number.POSITIVE_INFINITY;

    for (const item of withCoords) {
      const dLat = lat - item.lat;
      const dLng = lng - item.lng;
      const dist = dLat * dLat + dLng * dLng;
      if (dist < minDist) {
        minDist = dist;
        nearest = item;
      }
    }

    return nearest.stop;
  };

  const useCurrentLocationAsOrigin = () => {
    if (!selectedStops.length || !navigator.geolocation) {
      setError('Current location is unavailable on this device/browser');
      return;
    }

    setLocatingOrigin(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = findNearestStop(pos.coords.latitude, pos.coords.longitude, selectedStops);
        if (!nearest) {
          setError('Stops have no GPS coordinates. Please select origin manually.');
          setLocatingOrigin(false);
          return;
        }
        handleChange('origin_stop_id', String(nearest.stop_id));
        setLocatingOrigin(false);
      },
      () => {
        setError('Unable to get your current location. Please allow location access.');
        setLocatingOrigin(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  // Calculate fare when stops are selected
  useEffect(() => {
    const calculateFare = async () => {
      if (form.origin_stop_id && form.destination_stop_id && form.trip_id) {
        try {
          const routeId = selectedRoute?.route_id;
          const fleetId = selectedTrip?.fleet_route?.fleet_id;

          if (!routeId || !fleetId) {
            setFare(null);
            return;
          }

          const res = await PassengerService.quoteFare({
            route_id: routeId,
            fleet_id: fleetId,
            origin_stop_id: parseInt(form.origin_stop_id),
            destination_stop_id: parseInt(form.destination_stop_id),
            seat_type: form.seat_type,
          });
          const amount = res?.data?.amount ?? null;
          setFare(amount);
          setFareQuoteKey(amount != null ? currentFareQuoteKey : '');
        } catch (err) {
          setFare(null);
          setFareQuoteKey('');
          setError(err?.message || 'Failed to compute fare');
        }
      }
    };
    calculateFare();
  }, [form.origin_stop_id, form.destination_stop_id, form.trip_id, form.seat_type, selectedRoute, selectedTrip, currentFareQuoteKey]);

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

      <form onSubmit={handleSubmit} className="buy-form">
        <section className="buy-search-card">
          <h3>Book a Seat</h3>
          <p>Sign in is required only for history and rewards.</p>
          <div className="buy-fields-row">
            <select
              value={form.origin_stop_id}
              onChange={e => handleChange('origin_stop_id', e.target.value)}
              disabled={!selectedStops.length}
            >
              <option value="">From</option>
              {selectedStops.map((stop) => (
                <option key={`origin-${stop.stop_id}`} value={stop.stop_id}>{stopLabel(stop)}</option>
              ))}
            </select>

            <input
              type="text"
              list="destination-stop-list"
              value={destinationQuery}
              onChange={(e) => {
                const value = e.target.value;
                setDestinationQuery(value);
                const matched = selectedStops.find((s) => stopLabel(s).toLowerCase() === value.toLowerCase());
                if (matched) handleChange('destination_stop_id', String(matched.stop_id));
              }}
              placeholder="To"
              disabled={!selectedStops.length}
            />

            <datalist id="destination-stop-list">
              {selectedStops.map((stop) => (
                <option key={`dest-${stop.stop_id}`} value={stopLabel(stop)} />
              ))}
            </datalist>

            <select
              value={form.trip_id}
              onChange={e => {
                handleChange('trip_id', e.target.value);
                setDestinationQuery('');
                handleChange('origin_stop_id', '');
                handleChange('destination_stop_id', '');
              }}
            >
              <option value="">Select Trip</option>
              {trips.map((trip) => (
                <option key={trip.trip_id} value={trip.trip_id}>
                  {(trip.fleet_route?.route?.route_name || `Trip ${trip.trip_id}`)}
                </option>
              ))}
            </select>

            <button type="button" onClick={useCurrentLocationAsOrigin} disabled={!selectedStops.length || locatingOrigin}>
              {locatingOrigin ? 'Locating...' : 'Use Current'}
            </button>
          </div>
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
            <div className="buy-trip-list">
              {trips.map((trip, idx) => {
                const checked = form.trip_id === String(trip.trip_id);
                return (
                  <label key={trip.trip_id} className={`buy-trip-card ${checked ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="trip"
                      value={trip.trip_id}
                      checked={checked}
                      onChange={e => {
                        handleChange('trip_id', e.target.value);
                        setDestinationQuery('');
                        handleChange('origin_stop_id', '');
                        handleChange('destination_stop_id', '');
                      }}
                    />
                    <div className="buy-trip-main">
                      <h4>{idx + 1}. {trip.fleet_route?.route?.origin || '-'} to {trip.fleet_route?.route?.destination || '-'}</h4>
                      <p><Clock size={13} /> {trip.trip_date || 'Today'} • Status: {trip.status}</p>
                    </div>
                    <div className="buy-trip-side">
                      <strong>PHP {fare ? fare.toFixed(2) : '50.00'}</strong>
                      <span>per passenger</span>
                    </div>
                  </label>
                );
              })}
            </div>
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
                  {['seated', 'standing'].map(type => (
                    <label key={type}>
                      <input
                        type="radio"
                        name="seat_type"
                        value={type}
                        checked={form.seat_type === type}
                        onChange={e => handleChange('seat_type', e.target.value)}
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
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
                      onChange={e => handleChange('payment_method', e.target.value)}
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
                    {['gcash', 'maya', 'card'].map(channel => (
                      <label key={channel}>
                        <input
                          type="radio"
                          name="payment_channel"
                          value={channel}
                          checked={form.payment_channel === channel}
                          onChange={e => handleChange('payment_channel', e.target.value)}
                        />
                        <span>{channel}</span>
                      </label>
                    ))}
                  </div>
                  {isGuestCheckout && (
                    <input
                      type="email"
                      value={form.guest_email}
                      onChange={e => handleChange('guest_email', e.target.value)}
                      placeholder="Email for guest receipt"
                    />
                  )}
                </div>
              )}

              <div className="buy-stop-selectors">
                <label>
                  <MapPin size={14} /> Origin Stop
                  <select
                    value={form.origin_stop_id}
                    onChange={e => handleChange('origin_stop_id', e.target.value)}
                  >
                    <option value="">Select origin stop...</option>
                    {selectedStops.map((stop) => (
                      <option key={`origin-select-${stop.stop_id}`} value={stop.stop_id}>{stopLabel(stop)}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <MapPin size={14} /> Destination Stop
                  <select
                    value={form.destination_stop_id}
                    onChange={e => {
                      handleChange('destination_stop_id', e.target.value);
                      const matched = selectedStops.find((s) => String(s.stop_id) === String(e.target.value));
                      setDestinationQuery(matched ? stopLabel(matched) : '');
                    }}
                  >
                    <option value="">Select destination stop...</option>
                    {selectedStops.map((stop) => (
                      <option key={`dest-select-${stop.stop_id}`} value={stop.stop_id}>{stopLabel(stop)}</option>
                    ))}
                  </select>
                </label>
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
                <div><span>Total</span><strong>PHP {fare ? fare.toFixed(2) : '0.00'}</strong></div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !form.origin_stop_id || !form.destination_stop_id || (form.payment_method === 'online' && !canProceedToOnlinePayment)}
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
