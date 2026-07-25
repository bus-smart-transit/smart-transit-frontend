import { useState, useEffect, useCallback, useRef } from 'react';
import PassengerService from '../../PassengerService/PassengerService';
import useDropoffPicker from './useDropoffPicker';

const CHECKOUT_EVENT_KEY = 'smart_transit_checkout_event';
const CHECKOUT_PENDING_KEY = 'smart_transit_checkout_pending';
const CHECKOUT_LOOKUP_CACHE_KEY = 'smart_transit_checkout_lookup_cache_v1';
const TICKET_QR_CACHE_KEY = 'smart_transit_ticket_qr_cache_v1';
const LOOKUP_CACHE_TTL_MS = 60 * 1000;
const QR_CACHE_TTL_MS = 5 * 60 * 1000;

const toDateInputValue = (value = new Date()) => {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, '0');
  const dd = String(value.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const toTripDateValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return toDateInputValue(date);
};

const toRad = (deg) => (deg * Math.PI) / 180;
const distanceKm = (aLat, aLng, bLat, bLng) => {
  const earthRadiusKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const aa = Math.sin(dLat / 2) ** 2
    + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(aa));
};

const pickStopName = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.stop_name || value.name || null;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readSessionCache = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeSessionCache = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures (private mode/quota).
  }
};

const getCachedEntry = (cache, key, ttlMs) => {
  const entry = cache[key];
  if (!entry || typeof entry !== 'object') return null;
  if ((Date.now() - Number(entry.ts || 0)) > ttlMs) return null;
  return entry.value;
};

const setCachedEntry = (cache, key, value) => {
  cache[key] = {
    ts: Date.now(),
    value,
  };
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} - ${hh}:${min}`;
};

const extractStopCoordinates = (stopLike) => {
  if (!stopLike) return null;
  const lat = Number(stopLike?.stop?.latitude ?? stopLike?.latitude);
  const lng = Number(stopLike?.stop?.longitude ?? stopLike?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
};

const findNearestStop = (lat, lng, stops) => {
  const withCoords = stops
    .map((stopItem) => {
      const sLat = Number(stopItem?.stop?.latitude ?? stopItem?.latitude);
      const sLng = Number(stopItem?.stop?.longitude ?? stopItem?.longitude);
      return Number.isFinite(sLat) && Number.isFinite(sLng)
        ? { stop: stopItem, lat: sLat, lng: sLng }
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

export default function useBuyTicket({ onTicketPurchased }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [routeWarning, setRouteWarning] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fare, setFare] = useState(null);
  const [fareQuoteKey, setFareQuoteKey] = useState('');
  const [locatingOrigin, setLocatingOrigin] = useState(false);
  const [dropoffMode, setDropoffMode] = useState('stop');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [isGuestCheckout] = useState(() => !(localStorage.getItem('passenger_token') || sessionStorage.getItem('passenger_token')));
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [checkoutStatus, setCheckoutStatus] = useState('idle');
  const [qrTickets, setQrTickets] = useState([]);
  const [loadingQr, setLoadingQr] = useState(false);
  const [availableRewardPoints, setAvailableRewardPoints] = useState(0);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const checkoutStartCounterRef = useRef(1);
  const lookupCacheRef = useRef(readSessionCache(CHECKOUT_LOOKUP_CACHE_KEY));
  const qrCacheRef = useRef(readSessionCache(TICKET_QR_CACHE_KEY));
  const inFlightLookupRef = useRef(new Set());
  const processedCheckoutRef = useRef(new Set());
  const lastCheckoutEventTsRef = useRef(0);

  const [form, setForm] = useState({
    trip_id: '',
    seat_type: 'seated',
    payment_method: 'online',
    payment_channel: 'gcash',
    booking_option: 'now',
    booking_date: toDateInputValue(),
    search_from: '',
    search_to: '',
    search_date: toDateInputValue(),
    ticket_quantity: '1',
    use_rewards: false,
    reward_points_to_use: '',
    guest_email: '',
    origin_stop_id: '',
    destination_stop_id: '',
    destination_lat: '',
    destination_lng: '',
  });

  const selectedTrip = trips.find((trip) => trip.trip_id === parseInt(form.trip_id, 10));
  const selectedRoute = selectedTrip?.fleet_route?.route || null;
  const selectedStops = selectedRoute?.routeStops || selectedRoute?.route_stops || [];
  const selectedOriginStop = selectedStops.find((stop) => String(stop.stop_id) === String(form.origin_stop_id));
  const stopLabel = (stop) => stop?.stop?.stop_name || stop?.stop_name || `Stop ${stop?.stop_id}`;

  const quantity = Math.max(1, parseInt(form.ticket_quantity, 10) || 1);
  const unitFare = Number(fare ?? 0);
  const grossTotal = Number.isFinite(unitFare) ? Number((unitFare * quantity).toFixed(2)) : 0;
  const requestedRewardPoints = Math.max(0, parseInt(form.reward_points_to_use, 10) || 0);
  const maxRedeemableByTotal = Math.max(0, Math.floor(grossTotal - 1));
  const maxRedeemableRewardPoints = Math.min(availableRewardPoints, maxRedeemableByTotal);
  const rewardPointsToApply = form.use_rewards ? Math.min(requestedRewardPoints, maxRedeemableRewardPoints) : 0;
  const isRewardRequestInsufficient = form.use_rewards && requestedRewardPoints > maxRedeemableRewardPoints;
  const netTotal = Number(Math.max(0, grossTotal - rewardPointsToApply).toFixed(2));
  const hasRewardPoints = availableRewardPoints > 0;

  const filteredTrips = trips.filter((trip) => {
    const route = trip?.fleet_route?.route || {};
    const origin = String(route?.origin || '').toLowerCase();
    const destination = String(route?.destination || '').toLowerCase();
    const fromQuery = String(form.search_from || '').trim().toLowerCase();
    const toQuery = String(form.search_to || '').trim().toLowerCase();
    const dateQuery = form.search_date || '';

    const fromMatch = !fromQuery || origin.includes(fromQuery);
    const toMatch = !toQuery || destination.includes(toQuery);
    const dateMatch = !dateQuery || toTripDateValue(trip?.trip_date) === dateQuery;

    return fromMatch && toMatch && dateMatch;
  });

  const suggestedTrips = filteredTrips.length === 0 && form.search_date
    ? trips
      .filter((trip) => {
        const route = trip?.fleet_route?.route || {};
        const origin = String(route?.origin || '').toLowerCase();
        const destination = String(route?.destination || '').toLowerCase();
        const fromQuery = String(form.search_from || '').trim().toLowerCase();
        const toQuery = String(form.search_to || '').trim().toLowerCase();
        const tripDate = toTripDateValue(trip?.trip_date);

        if (!tripDate) return false;
        if (tripDate < form.search_date) return false;

        const fromMatch = !fromQuery || origin.includes(fromQuery);
        const toMatch = !toQuery || destination.includes(toQuery);
        return fromMatch && toMatch;
      })
      .sort((a, b) => String(a?.trip_date || '').localeCompare(String(b?.trip_date || '')))
      .slice(0, 8)
    : [];

  const visibleTrips = filteredTrips.length > 0 ? filteredTrips : suggestedTrips;
  const showingSuggestedTrips = filteredTrips.length === 0 && suggestedTrips.length > 0;
  const todayDateValue = toDateInputValue();
  const hasBookNowOption = visibleTrips.some((trip) => toTripDateValue(trip?.trip_date) === todayDateValue);
  const minBookingDate = (() => {
    const today = todayDateValue;
    const selectedTripDate = toTripDateValue(selectedTrip?.trip_date);
    if (form.booking_option !== 'later') return today;
    if (!selectedTripDate) return today;
    return selectedTripDate > today ? selectedTripDate : today;
  })();

  const currentFareQuoteKey = [
    form.trip_id,
    selectedRoute?.route_id || '',
    selectedTrip?.fleet_route?.fleet_id || '',
    dropoffMode,
    form.origin_stop_id,
    form.destination_stop_id,
    form.destination_lat,
    form.destination_lng,
    form.seat_type,
  ].join('|');

  const canProceedToOnlinePayment = fare != null && fareQuoteKey === currentFareQuoteKey;

  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setError('');
    setSuccess('');
    if (field === 'origin_stop_id' || field === 'trip_id') {
      setRouteWarning('');
    }
  }, []);

  const setDestinationLat = useCallback((value) => {
    handleChange('destination_lat', value);
  }, [handleChange]);

  const setDestinationLng = useCallback((value) => {
    handleChange('destination_lng', value);
  }, [handleChange]);

  const {
    mapContainerRef,
    locatingDropoff,
    destinationPinnedLabel,
    originPinnedLabel,
    clearDestinationPinnedLabel,
    pinCurrentLocationAsOrigin,
  } = useDropoffPicker({
    dropoffMode,
    selectedOriginStop,
    selectedStops,
    destinationLat: form.destination_lat,
    destinationLng: form.destination_lng,
    stopLabel,
    setError,
    setOriginStopId: (value) => handleChange('origin_stop_id', value),
    setDestinationLat,
    setDestinationLng,
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

  const printQrTicket = useCallback((ticket, idx) => {
    if (!ticket?.qr_url) return;

    const popup = window.open('', '_blank', 'width=900,height=700');
    if (!popup) return;

    popup.document.write(`
      <html>
        <head>
          <title>Ticket QR ${idx + 1}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 18px; color: #0f172a; background: #f8fafc; }
            .ticket { max-width: 760px; border: 1px solid #d6dbe5; border-radius: 12px; overflow: hidden; background: #fff; }
            .head { background: linear-gradient(145deg, #2ab557, #31c964); color: #fff; padding: 18px; }
            .head h1 { margin: 0; font-size: 20px; }
            .head h2 { margin: 4px 0 0; font-size: 32px; line-height: 1.05; }
            .strip { margin-top: 14px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
            .strip span { display: block; font-size: 10px; text-transform: uppercase; opacity: 0.85; }
            .strip strong { display: block; margin-top: 2px; font-size: 13px; }
            .body { padding: 14px; display: grid; grid-template-columns: 160px 1fr; gap: 14px; border-top: 2px dashed #d6dbe5; }
            .qr-wrap { width: 160px; height: 160px; border: 1px solid #d7dee8; border-radius: 10px; display: grid; place-items: center; background: #fff; }
            img { width: 146px; height: 146px; object-fit: contain; }
            .meta { display: grid; gap: 8px; }
            .meta div { display: flex; justify-content: space-between; border-bottom: 1px solid #ebeff5; padding-bottom: 6px; }
            .meta .k { color: #64748b; font-size: 12px; }
            .meta .v { color: #0f172a; font-size: 13px; font-weight: 700; }
            .foot { margin: 0 14px 14px; border: 1px solid #9dd7af; background: #eaf9f0; color: #166534; border-radius: 10px; padding: 9px 10px; font-size: 12px; text-align: center; font-weight: 700; }
          </style>
        </head>
        <body>
          <article class="ticket">
            <header class="head">
              <h1>Ecoland Terminal</h1>
              <h2>${ticket.destination || 'Tagum Terminal'}</h2>
              <div class="strip">
                <div><span>Departure</span><strong>${formatDateTime(ticket.valid_from)}</strong></div>
                <div><span>Seat</span><strong>${ticket.seat_type || '-'}</strong></div>
                <div><span>Route</span><strong>Same sa Route</strong></div>
              </div>
            </header>
            <div class="body">
              <div class="qr-wrap"><img src="${ticket.qr_url}" alt="Ticket QR" /></div>
              <div class="meta">
                <div><span class="k">Valid</span><span class="v">${formatDateTime(ticket.valid_from)}</span></div>
                <div><span class="k">Expires</span><span class="v">${formatDateTime(ticket.expires_at)}</span></div>
                <div><span class="k">Status</span><span class="v">Valid</span></div>
                <div><span class="k">Fare Paid</span><span class="v">PHP ${Number(ticket.amount || 0).toFixed(2)}</span></div>
              </div>
            </div>
            <div class="foot">Valid Ticket — Present QR code to board</div>
          </article>
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);
    popup.document.close();
  }, []);

  const toGuestQrTicket = useCallback((ticket) => {
    const qrContent = ticket.ticket_uuid;
    const destinationName =
      pickStopName(ticket?.destination_stop) ||
      pickStopName(ticket?.destinationStop) ||
      ticket?.destination ||
      ticket?.trip?.fleet_route?.route?.destination ||
      ticket?.trip?.fleetRoute?.route?.destination ||
      null;

    return {
      ticket_uuid: ticket.ticket_uuid,
      qr_content: qrContent,
      qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrContent)}`,
      destination: destinationName || 'Not specified',
      seat_type: ticket?.seat_type,
      amount: ticket?.amount,
      valid_from: ticket?.valid_from ?? null,
      expires_at: ticket?.expires_at ?? null,
    };
  }, []);

  const toPassengerTicketCardData = useCallback((ticket) => {
    const destinationName =
      pickStopName(ticket?.destination_stop) ||
      pickStopName(ticket?.destinationStop) ||
      ticket?.destination ||
      ticket?.trip?.fleet_route?.route?.destination ||
      ticket?.trip?.fleetRoute?.route?.destination ||
      null;

    return {
      ticket_uuid: ticket.ticket_uuid,
      qr_content: ticket.ticket_uuid,
      qr_url: null,
      destination: destinationName || 'Not specified',
      seat_type: ticket?.seat_type,
      amount: ticket?.amount,
      valid_from: ticket?.valid_from ?? null,
      expires_at: ticket?.expires_at ?? null,
    };
  }, []);

  const clearPendingCheckout = useCallback(() => {
    setPendingCheckout(null);
    localStorage.removeItem(CHECKOUT_PENDING_KEY);
  }, []);

  const persistLookupCache = useCallback(() => {
    writeSessionCache(CHECKOUT_LOOKUP_CACHE_KEY, lookupCacheRef.current);
  }, []);

  const persistQrCache = useCallback(() => {
    writeSessionCache(TICKET_QR_CACHE_KEY, qrCacheRef.current);
  }, []);

  const applyQrTicketData = useCallback(async (matchedTickets) => {
    if (!Array.isArray(matchedTickets) || matchedTickets.length === 0) {
      setQrTickets([]);
      return;
    }

    if (isGuestCheckout) {
      setQrTickets(matchedTickets.map(toGuestQrTicket));
      return;
    }

    const qrResponses = await Promise.all(
      matchedTickets.slice(0, 5).map(async (ticket) => {
        const ticketUuid = ticket?.ticket_uuid;
        if (!ticketUuid) return null;

        const cachedQr = getCachedEntry(qrCacheRef.current, ticketUuid, QR_CACHE_TTL_MS);
        if (cachedQr) {
          return cachedQr;
        }

        try {
          const qrRes = await PassengerService.getTicketQR(ticketUuid);
          const resolved = qrRes?.data ?? qrRes ?? null;
          if (resolved) {
            setCachedEntry(qrCacheRef.current, ticketUuid, resolved);
            persistQrCache();
          }
          return resolved;
        } catch {
          return null;
        }
      }),
    );

    const resolvedQr = qrResponses.filter(Boolean);
    if (resolvedQr.length > 0) {
      setQrTickets(resolvedQr);
    } else {
      // Ticket exists but QR may be inactive until trip date.
      setQrTickets(matchedTickets.map(toPassengerTicketCardData));
    }
  }, [isGuestCheckout, persistQrCache, toGuestQrTicket, toPassengerTicketCardData]);

  const loadPurchasedQrTickets = useCallback(async (checkoutMeta) => {
    if (!checkoutMeta?.transactionReference) return;

    const lookupKey = [
      String(checkoutMeta.transactionReference || ''),
      String(checkoutMeta.paymentId || ''),
      String(checkoutMeta.guestEmail || ''),
      isGuestCheckout ? 'guest' : 'auth',
    ].join('|');

    if (processedCheckoutRef.current.has(lookupKey)) {
      const cachedTickets = getCachedEntry(lookupCacheRef.current, lookupKey, LOOKUP_CACHE_TTL_MS);
      if (cachedTickets) {
        await applyQrTicketData(cachedTickets);
      }
      return;
    }

    if (inFlightLookupRef.current.has(lookupKey)) {
      return;
    }

    inFlightLookupRef.current.add(lookupKey);

    setLoadingQr(true);
    try {
      const cachedTickets = getCachedEntry(lookupCacheRef.current, lookupKey, LOOKUP_CACHE_TTL_MS);
      if (cachedTickets && cachedTickets.length > 0) {
        await applyQrTicketData(cachedTickets);
        processedCheckoutRef.current.add(lookupKey);
        return;
      }

      const maxAttempts = 6;
      const retryDelayMs = 1500;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        let matchedTickets = [];

        try {
          const lookup = await PassengerService.guestLookupTicket({
            transaction_reference: checkoutMeta.transactionReference,
            email: checkoutMeta.guestEmail || undefined,
            payment_id: checkoutMeta.paymentId || undefined,
          });

          const allTickets = lookup?.data ?? lookup ?? [];
          matchedTickets = checkoutMeta.paymentId
            ? allTickets.filter((ticket) => Number(ticket?.payment_id) === Number(checkoutMeta.paymentId))
            : allTickets;
        } catch (lookupError) {
          const statusCode = lookupError?.cause?.response?.status;
          if (statusCode !== 404 && statusCode !== 422 && attempt === maxAttempts) {
            throw lookupError;
          }
        }

        if (matchedTickets.length > 0) {
          setCachedEntry(lookupCacheRef.current, lookupKey, matchedTickets);
          persistLookupCache();
          await applyQrTicketData(matchedTickets);
          processedCheckoutRef.current.add(lookupKey);
          return;
        }

        if (attempt < maxAttempts) {
          await sleep(retryDelayMs);
        }
      }

      setQrTickets([]);
      setSuccess('Payment successful. Your ticket will be available on the scheduled trip date.');
    } catch (err) {
      setError(err?.message || 'Payment succeeded but we could not load your ticket QR yet.');
    } finally {
      inFlightLookupRef.current.delete(lookupKey);
      setLoadingQr(false);
    }
  }, [applyQrTicketData, isGuestCheckout, persistLookupCache]);

  const handleCheckoutResult = useCallback((status, eventTs = Date.now()) => {
    const normalizedTs = Number(eventTs || Date.now());
    if (normalizedTs <= lastCheckoutEventTsRef.current) {
      return;
    }
    lastCheckoutEventTsRef.current = normalizedTs;

    const normalized = status === 'success' ? 'success' : 'cancel';
    setCheckoutStatus(normalized);

    if (normalized === 'success') {
      setSuccess('Payment successful. We will show your ticket QR once it becomes active.');
      setError('');

      if (!pendingCheckout) {
        localStorage.removeItem(CHECKOUT_EVENT_KEY);
        return;
      }

      void (async () => {
        await loadPurchasedQrTickets(pendingCheckout);
        onTicketPurchased?.();
        clearPendingCheckout();
        localStorage.removeItem(CHECKOUT_EVENT_KEY);
      })();

      return;
    }

    setSuccess('');
    setQrTickets([]);
    setError('Payment was cancelled or failed. You may retry payment.');
    clearPendingCheckout();
    localStorage.removeItem(CHECKOUT_EVENT_KEY);
  }, [pendingCheckout, onTicketPurchased, loadPurchasedQrTickets, clearPendingCheckout]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTrips();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadTrips]);

  useEffect(() => {
    if (isGuestCheckout) {
      setAvailableRewardPoints(0);
      setLoadingRewards(false);
      return;
    }

    let cancelled = false;

    const loadRewardBalance = async () => {
      setLoadingRewards(true);
      try {
        const profileRes = await PassengerService.getProfile();
        const profile = profileRes?.data ?? profileRes ?? {};
        const points = Number(profile?.reward_points ?? 0);
        if (!cancelled) {
          setAvailableRewardPoints(Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0);
        }
      } catch {
        if (!cancelled) {
          setAvailableRewardPoints(0);
        }
      } finally {
        if (!cancelled) {
          setLoadingRewards(false);
        }
      }
    };

    void loadRewardBalance();

    return () => {
      cancelled = true;
    };
  }, [isGuestCheckout]);

  useEffect(() => {
    if (form.booking_option === 'now' && form.booking_date !== toDateInputValue()) {
      setForm((prev) => ({ ...prev, booking_date: toDateInputValue() }));
    }
  }, [form.booking_date, form.booking_option]);

  useEffect(() => {
    if (form.booking_option === 'now' && !hasBookNowOption) {
      setForm((prev) => ({
        ...prev,
        booking_option: 'later',
        booking_date: prev.booking_date < minBookingDate ? minBookingDate : prev.booking_date,
      }));
    }
  }, [form.booking_option, hasBookNowOption, minBookingDate]);

  useEffect(() => {
    if (form.booking_option !== 'later') return;
    if (!form.booking_date) return;
    if (form.booking_date < minBookingDate) {
      setForm((prev) => ({ ...prev, booking_date: minBookingDate }));
    }
  }, [form.booking_date, form.booking_option, minBookingDate]);

  useEffect(() => {
    const storedPending = localStorage.getItem(CHECKOUT_PENDING_KEY);
    if (!storedPending) return;

    try {
      const parsedPending = JSON.parse(storedPending);
      setTimeout(() => {
        setPendingCheckout(parsedPending);
        setCheckoutStatus('pending');
        setSuccess('Secure checkout is in progress in another tab.');
      }, 0);

      const storedEvent = localStorage.getItem(CHECKOUT_EVENT_KEY);
      if (storedEvent) {
        const eventPayload = JSON.parse(storedEvent);
        if ((eventPayload?.timestamp ?? 0) >= (parsedPending?.startedAt ?? 0) && eventPayload?.status) {
          setTimeout(() => {
            handleCheckoutResult(eventPayload.status, eventPayload.timestamp);
          }, 0);
        }
      }
    } catch {
      localStorage.removeItem(CHECKOUT_PENDING_KEY);
    }
  }, [handleCheckoutResult]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== CHECKOUT_EVENT_KEY || !event.newValue) return;

      try {
        const payload = JSON.parse(event.newValue);
        if (payload?.status) {
          handleCheckoutResult(payload.status, payload.timestamp);
        }
      } catch {
        // Ignore malformed events.
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [handleCheckoutResult]);

  useEffect(() => {
    const calculateFare = async () => {
      if (!form.trip_id || !form.origin_stop_id) {
        setFare(null);
        setFareQuoteKey('');
        return;
      }

      try {
        if (dropoffMode === 'custom') {
          if (!form.destination_lat || !form.destination_lng) {
            setFare(null);
            setFareQuoteKey('');
            return;
          }

          const originCoords = extractStopCoordinates(selectedOriginStop);
          if (!originCoords) {
            setFare(null);
            setFareQuoteKey('');
            setError('Selected origin stop has no coordinates for custom drop-off mode');
            return;
          }

          const selectedFleetId = Number(selectedTrip?.fleet_route?.fleet_id);
          if (!selectedFleetId) {
            setFare(null);
            setFareQuoteKey('');
            return;
          }

          const res = await PassengerService.quoteFleetsByLocation({
            origin_lat: originCoords.lat,
            origin_lng: originCoords.lng,
            destination_lat: Number(form.destination_lat),
            destination_lng: Number(form.destination_lng),
            seat_type: form.seat_type,
          });

          const fleets = res?.data?.fleets ?? [];
          const matchedFleet = fleets.find((fleet) => Number(fleet?.fleet_id) === selectedFleetId);
          const amount = matchedFleet?.amount ?? null;
          setFare(amount);
          setFareQuoteKey(amount != null ? currentFareQuoteKey : '');
          return;
        }

        if (!form.destination_stop_id) {
          setFare(null);
          setFareQuoteKey('');
          return;
        }

        const routeId = selectedRoute?.route_id;
        const fleetId = selectedTrip?.fleet_route?.fleet_id;

        if (!routeId || !fleetId) {
          setFare(null);
          setFareQuoteKey('');
          return;
        }

        const res = await PassengerService.quoteFare({
          route_id: routeId,
          fleet_id: fleetId,
          origin_stop_id: parseInt(form.origin_stop_id, 10),
          destination_stop_id: parseInt(form.destination_stop_id, 10),
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
    };

    void calculateFare();
  }, [
    currentFareQuoteKey,
    dropoffMode,
    form.destination_lat,
    form.destination_lng,
    form.destination_stop_id,
    form.origin_stop_id,
    form.seat_type,
    form.trip_id,
    selectedOriginStop,
    selectedRoute,
    selectedTrip,
  ]);

  const useCurrentLocationAsOrigin = useCallback(() => {
    if (!selectedStops.length || !navigator.geolocation) {
      setError('Current location is unavailable on this device/browser');
      return;
    }

    setLocatingOrigin(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const currentLat = Number(pos.coords.latitude);
        const currentLng = Number(pos.coords.longitude);
        const nearest = findNearestStop(currentLat, currentLng, selectedStops);
        if (!nearest) {
          setError('Stops have no GPS coordinates. Please select origin manually.');
          setLocatingOrigin(false);
          return;
        }

        const stopLat = Number(nearest?.stop?.latitude ?? nearest?.latitude);
        const stopLng = Number(nearest?.stop?.longitude ?? nearest?.longitude);
        if (Number.isFinite(stopLat) && Number.isFinite(stopLng)) {
          const km = distanceKm(currentLat, currentLng, stopLat, stopLng);
          if (km > 2) {
            setRouteWarning(`You appear to be ${km.toFixed(2)} km away from the nearest designated route stop. Please proceed closer to the route before booking.`);
          } else {
            setRouteWarning('');
          }
        }

        handleChange('origin_stop_id', String(nearest.stop_id));
        setLocatingOrigin(false);
      },
      () => {
        setError('Unable to get your current location. Please allow location access.');
        setLocatingOrigin(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }, [handleChange, selectedStops]);

  const handleTripSelect = useCallback((tripIdValue) => {
    handleChange('trip_id', tripIdValue);
    setDestinationQuery('');
    handleChange('origin_stop_id', '');
    handleChange('destination_stop_id', '');
    handleChange('destination_lat', '');
    handleChange('destination_lng', '');
    clearDestinationPinnedLabel();

    if (tripIdValue) {
      const picked = trips.find((trip) => String(trip.trip_id) === String(tripIdValue));
      const tripDate = picked?.trip_date ? toDateInputValue(new Date(picked.trip_date)) : '';
      const route = picked?.fleet_route?.route || {};
      if (tripDate) {
        handleChange('booking_date', tripDate);
        handleChange('search_date', tripDate);
        if (tripDate > toDateInputValue()) {
          handleChange('booking_option', 'later');
        }
      }
      handleChange('search_from', route?.origin || '');
      handleChange('search_to', route?.destination || '');
    }
  }, [clearDestinationPinnedLabel, handleChange, trips]);

  const handleDropoffModeChange = useCallback((nextMode) => {
    setDropoffMode(nextMode);
    setFare(null);
    setFareQuoteKey('');

    if (nextMode === 'stop') {
      handleChange('destination_lat', '');
      handleChange('destination_lng', '');
      clearDestinationPinnedLabel();
    } else {
      handleChange('destination_stop_id', '');
      setDestinationQuery('');
    }
  }, [clearDestinationPinnedLabel, handleChange]);

  const handleDestinationStopChange = useCallback((value) => {
    handleChange('destination_stop_id', value);
    const matched = selectedStops.find((stopItem) => String(stopItem.stop_id) === String(value));
    setDestinationQuery(matched ? stopLabel(matched) : '');
  }, [handleChange, selectedStops]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    setError('');
    setFormErrors({});
    setSuccess('');
    setIsSubmitting(true);

    try {
      const nextErrors = {};
      const todayDate = toDateInputValue();
      const selectedTripDate = selectedTrip?.trip_date ? toDateInputValue(new Date(selectedTrip.trip_date)) : null;

      if (!form.trip_id) {
        nextErrors.trip_id = 'Please select a trip.';
      }
      if (!form.origin_stop_id) {
        nextErrors.origin_stop_id = 'Please select origin stop.';
      }
      if (!Number.isFinite(parseInt(form.ticket_quantity, 10)) || parseInt(form.ticket_quantity, 10) < 1) {
        nextErrors.ticket_quantity = 'Ticket quantity must be at least 1.';
      }
      if (dropoffMode === 'stop' && !form.destination_stop_id) {
        nextErrors.destination_stop_id = 'Please select destination stop.';
      }
      if (dropoffMode === 'stop' && form.origin_stop_id && form.destination_stop_id && form.origin_stop_id === form.destination_stop_id) {
        nextErrors.destination_stop_id = 'Destination stop must be different from origin stop.';
      }
      if (dropoffMode === 'custom' && (!form.destination_lat || !form.destination_lng)) {
        nextErrors.destination_lat = 'Please pin a custom drop-off on the map.';
      }
      if (form.booking_option === 'later') {
        if (!form.booking_date) {
          nextErrors.booking_date = 'Please select your planned travel date.';
        } else if (form.booking_date <= todayDate) {
          nextErrors.booking_date = 'Book later requires a future date.';
        }
      }
      if (form.booking_option === 'now' && form.booking_date && form.booking_date !== todayDate) {
        nextErrors.booking_date = 'Book now only supports today.';
      }
      if (form.booking_date && selectedTripDate && selectedTripDate !== form.booking_date) {
        nextErrors.trip_id = `Selected trip is for ${selectedTripDate}. Please pick a trip that matches your booking date.`;
      }
      if (form.payment_method === 'online' && !canProceedToOnlinePayment) {
        nextErrors.payment = 'Please get a valid fare quote before proceeding to online payment.';
      }
      if (form.use_rewards && isRewardRequestInsufficient) {
        nextErrors.reward_points_to_use = `Insufficient reward points for this booking. Max usable now: ${maxRedeemableRewardPoints} RP.`;
      }

      if (Object.keys(nextErrors).length > 0) {
        setFormErrors(nextErrors);
        return;
      }

      const payload = {
        items: [],
        return_base_url: window.location.origin,
      };

      const itemPayload = dropoffMode === 'custom'
        ? (() => {
          const originCoords = extractStopCoordinates(selectedOriginStop);
          if (!originCoords) {
            throw new Error('Selected origin stop has no coordinates for custom drop-off mode');
          }

          return {
            trip_id: parseInt(form.trip_id, 10),
            seat_type: form.seat_type,
            origin_lat: originCoords.lat,
            origin_lng: originCoords.lng,
            destination_lat: Number(form.destination_lat),
            destination_lng: Number(form.destination_lng),
          };
        })()
        : {
          trip_id: parseInt(form.trip_id, 10),
          seat_type: form.seat_type,
          origin_stop_id: parseInt(form.origin_stop_id, 10),
          destination_stop_id: parseInt(form.destination_stop_id, 10),
        };

      for (let i = 0; i < quantity; i += 1) {
        payload.items.push({ ...itemPayload });
      }

      if (form.payment_method === 'online') {
        payload.payment_channel = form.payment_channel;
        if (isGuestCheckout && form.guest_email) payload.guest_email = form.guest_email;
        if (!isGuestCheckout && form.use_rewards && rewardPointsToApply > 0) {
          payload.reward_points_to_use = rewardPointsToApply;
        }

        const res = await PassengerService.checkoutOnline(payload);
        const checkoutUrl = res?.data?.checkout_url || res?.checkout_url || null;

        const paymentPayload = res?.data?.payment || res?.payment || {};
        const checkoutMeta = {
          paymentId: paymentPayload?.payment_id ?? null,
          transactionReference: paymentPayload?.transaction_reference ?? null,
          guestEmail: isGuestCheckout ? (form.guest_email || null) : null,
          returnPath: `${window.location.pathname}${window.location.search}`,
          startedAt: checkoutStartCounterRef.current++,
        };

        if (!checkoutUrl) {
          throw new Error('Checkout URL was not returned by the payment gateway. Please try again.');
        }

        setPendingCheckout(checkoutMeta);
        setCheckoutStatus('pending');
        setQrTickets([]);
        localStorage.setItem(CHECKOUT_PENDING_KEY, JSON.stringify(checkoutMeta));

        const checkoutTab = window.open(checkoutUrl, '_blank');
        if (!checkoutTab) {
          localStorage.removeItem(CHECKOUT_PENDING_KEY);
          setPendingCheckout(null);
          setCheckoutStatus('idle');
          throw new Error('Popup was blocked. Please enable popups and try again.');
        }

        setSuccess('Secure checkout opened in a new tab. Complete payment there.');
        return;
      }

      setError('Onsite checkout is only available at the terminal with a conductor');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canProceedToOnlinePayment,
    dropoffMode,
    form.destination_lat,
    form.destination_lng,
    form.destination_stop_id,
    form.booking_date,
    form.booking_option,
    form.search_date,
    form.search_from,
    form.search_to,
    form.guest_email,
    form.origin_stop_id,
    form.payment_channel,
    form.payment_method,
    form.ticket_quantity,
    form.use_rewards,
    form.reward_points_to_use,
    form.seat_type,
    form.trip_id,
    isRewardRequestInsufficient,
    isGuestCheckout,
    maxRedeemableRewardPoints,
    minBookingDate,
    quantity,
    rewardPointsToApply,
    selectedOriginStop,
    selectedTrip,
  ]);

  return {
    canProceedToOnlinePayment,
    checkoutStatus,
    clearDestinationPinnedLabel,
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
    isRewardRequestInsufficient,
    isGuestCheckout,
    isSubmitting,
    loadingRewards,
    loading,
    loadingQr,
    locatingDropoff,
    locatingOrigin,
    mapContainerRef,
    maxRedeemableRewardPoints,
    netTotal,
    minBookingDate,
    originPinnedLabel,
    pinCurrentLocationAsOrigin: useCurrentLocationAsOrigin,
    printQrTicket,
    qrTickets,
    rewardPointsToApply,
    selectedRoute,
    selectedStops,
    selectedTrip,
    setDestinationQuery,
    stopLabel,
    success,
    routeWarning,
    trips: visibleTrips,
    showingSuggestedTrips,
    hasBookNowOption,
    totalTickets: quantity,
    unitFare,
    availableRewardPoints,
    useCurrentLocationAsOrigin,
  };
}
