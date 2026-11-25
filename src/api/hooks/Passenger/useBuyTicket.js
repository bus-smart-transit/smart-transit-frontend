import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import PassengerService from '../../PassengerService/PassengerService';
import { checkoutIdempotencyKey, clearCheckoutIdempotencyKey, shouldDropCheckoutKey } from '../../../utils/checkoutIdempotency';
import { getBookingWindow, getTripDiscountTypes, readApiError } from '../../../services/bookingService';
import { itemsWithClaims } from '../../../utils/discountClaim';
import { baggageCount, itemsWithExtras, priorityAfterClaim } from '../../../utils/ticketExtras';
import { useBookingStops, useDepartures, useTripResolution } from './useBookingSearch';
import useBookingLink from './useBookingLink';
import useTripTimeline from './useTripTimeline';
import { findStopCode, withBookingParams } from '../../../utils/bookingQuery';
import { groupQrPayload, openPrintWindow } from '../../../utils/qr';
import { ticketExtraRows, ticketPrintHtml } from '../../../utils/ticketPrint';
import { normalizeContact } from '../../../utils/travellerContact';
import { ratePercentLabel, transactionFee } from '../../../utils/transactionFee';
import { clock12 } from '../../../utils/clock';
const CHECKOUT_EVENT_KEY = 'smart_transit_checkout_event';
const CHECKOUT_PENDING_KEY = 'smart_transit_checkout_pending';
const CHECKOUT_LOOKUP_CACHE_KEY = 'smart_transit_checkout_lookup_cache_v1';
const TICKET_QR_CACHE_KEY = 'smart_transit_ticket_qr_cache_v1';
const LOOKUP_CACHE_TTL_MS = 60 * 1000;
const QR_CACHE_TTL_MS = 5 * 60 * 1000;
// PayMongo checkout sessions are short-lived; treat a pending-checkout flag
// older than this as abandoned/stale rather than trusting it forever.
const CHECKOUT_PENDING_TTL_MS = 30 * 60 * 1000;
const DEFAULT_MAX_SEATS = 20;


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
  const str = String(value);
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(str);
  const date = new Date(isDateOnly ? str + 'T00:00' : str);
  if (Number.isNaN(date.getTime())) return '-';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  if (isDateOnly) return `${yyyy}/${mm}/${dd}`;
  return `${yyyy}/${mm}/${dd} - ${clock12(`${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`)}`;
};


// What a ticket row says about itself, from the server's own data (a custom drop-off
// carries its label; nothing here names a place).
const ticketMeta = (ticket) => {
  const transactionRef = ticket?.payment?.transaction_reference ?? null;
  return {
    origin: pickStopName(ticket?.origin_stop) || pickStopName(ticket?.originStop) || ticket?.origin || null,
    destination:
      ticket?.destination_label ||
      pickStopName(ticket?.destination_stop) ||
      pickStopName(ticket?.destinationStop) ||
      ticket?.destination ||
      ticket?.trip?.fleet_route?.route?.destination ||
      ticket?.trip?.fleetRoute?.route?.destination ||
      'Not specified',
    transaction_reference: transactionRef,
    group_qr_content: groupQrPayload(transactionRef),
    seat_type: ticket?.seat_type,
    amount: ticket?.amount,
    discount_type_key: ticket?.discount_type_key ?? null,
    discount_label: ticket?.discount_label ?? null,
    discount_rate: ticket?.discount_rate ?? null,
    original_amount: ticket?.original_amount ?? null,
    discount_amount: ticket?.discount_amount ?? null,
    discount_id_checked_at: ticket?.discount_id_checked_at ?? null,
    trip_date: ticket?.trip_date ?? ticket?.trip?.trip_date ?? null,
    departure_time: ticket?.departure_time ?? ticket?.trip?.departure_time ?? null,
    valid_from: ticket?.valid_from ?? null,
    expires_at: ticket?.expires_at ?? null,
    // The link that follows this ticket's bus (the owner's own; set by the server).
    tracking_token: ticket?.tracking_token ?? null,
    // Batch 49 item 5: the short code typed at "Track my bus".
    tracking_code: ticket?.tracking_code ?? null,
  };
};

export default function useBuyTicket({ onTicketPurchased }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const bookingLink = useBookingLink(searchParams);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  // Batch 75: each e-wallet's transaction fee rate (percent) from the server; null until it answers.
  const [feeRates, setFeeRates] = useState(null);
  // Batch 49 item 1: the most tickets in one purchase comes from the server (it checks it too); 20 until it answers.
  const [maxSeatsPerPurchase, setMaxSeatsPerPurchase] = useState(DEFAULT_MAX_SEATS);
  // Batch 76: the priority seat types from the server (none until it answers). 2026-11-25 (user): baggage is declared
  // here and paid on board, offered once the server says so.
  const [priorityTypes, setPriorityTypes] = useState([]);
  const [baggageOnBoard, setBaggageOnBoard] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBookingWindow()
      .then((window) => {
        const rates = window?.transaction_fee_rates;
        const maxSeats = Number(window?.max_seats_per_purchase);
        if (cancelled) return;
        setFeeRates(rates && typeof rates === 'object' ? rates : null);
        if (Number.isInteger(maxSeats) && maxSeats > 0) setMaxSeatsPerPurchase(maxSeats);
        setPriorityTypes(Array.isArray(window?.priority_types) ? window.priority_types : []);
        setBaggageOnBoard(window?.baggage_paid_on_board === true);
      })
      .catch(() => { if (!cancelled) setFeeRates(null); });
    return () => { cancelled = true; };
  }, []);
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuestCheckout] = useState(() => !(localStorage.getItem('passenger_token') || sessionStorage.getItem('passenger_token')));
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [checkoutStatus, setCheckoutStatus] = useState('idle');
  const [qrTickets, setQrTickets] = useState([]);
  const [loadingQr, setLoadingQr] = useState(false);
  const [availableRewardPoints, setAvailableRewardPoints] = useState(0);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const lookupCacheRef = useRef(readSessionCache(CHECKOUT_LOOKUP_CACHE_KEY));
  const qrCacheRef = useRef(readSessionCache(TICKET_QR_CACHE_KEY));
  const inFlightLookupRef = useRef(new Set());
  const processedCheckoutRef = useRef(new Set());
  const lastCheckoutEventTsRef = useRef(0);
  const pendingCheckoutRef = useRef(null);

  // The journey a passenger describes: where from, where to, and when. A shared or searched
  // booking link (stop codes + date) fills it in once the server has checked the link.
  const [form, setForm] = useState(() => ({
    origin_stop_id: '',
    destination_stop_id: '',
    booking_option: 'now',
    booking_date: '',
    booking_time: '',
    seat_type: 'seated',
    payment_channel: 'gcash',
    ticket_quantity: '1',
    // §4.10: several tickets get one group QR in the email by default; unticked, one QR per ticket.
    email_group_qr: true,
    use_rewards: false,
    reward_points_to_use: '',
    guest_email: '',
    // Batch 51 item 7: booking for someone else (their name and an email or mobile number).
    for_someone_else: false,
    traveller_name: '',
    traveller_contact: '',
    // Batch 75: the discount claimed for each ticket ({ ticketIndex: 'student' }); checked on the bus.
    discount_claims: {},
    // Batch 76: each ticket's priority seat and baggage ({ ticketIndex: { priority_type: 'pwd', baggage: true } }).
    ticket_extras: {},
  }));
  // Apply the checked link once (derived-state update during render, not an effect).
  const [linkApplied, setLinkApplied] = useState(false);
  if (!linkApplied && bookingLink.status === 'ok' && bookingLink.journey) {
    setLinkApplied(true);
    setForm((prev) => ({ ...prev, ...bookingLink.journey }));
  }
  // null = follow the destination the passenger searched for; a stop id = picked on the timeline.
  const [alightingStopId, setAlightingStopId] = useState(null);

  const stopsData = useBookingStops(form.origin_stop_id);

  // Once the passenger changes the journey, the address bar becomes a readable, shareable link:
  // stop codes and a date, no internal ids and no mode. Other query params (a tab) are kept.
  const journeyTouchedRef = useRef(false);
  const originCode = findStopCode(stopsData.originGroups, form.origin_stop_id);
  const destinationCode = findStopCode(stopsData.destinationGroups, form.destination_stop_id)
    || findStopCode(stopsData.originGroups, form.destination_stop_id);
  // The travel date is a Manila calendar date; until one is chosen it is today (from the server).
  const travelDate = form.booking_date || stopsData.today;
  const isToday = Boolean(travelDate) && travelDate === stopsData.today;
  // Batch 76 (user, 2026-11-17): Book Now / Book Later is gone; the passenger always picks from the date's departures
  // ("Select departure time", the next one selected first). The mode is page state, never part of the URL.
  const bookingMode = 'later';


  // Book Now: the server picks the next departure today. Book Later: the passenger picks one of the
  // date's departures (a compact time selector); the first is selected until they choose another.
  const [selectedDepartureId, setSelectedDepartureId] = useState('');
  const nowResolution = useTripResolution({
    mode: 'now',
    originStopId: bookingMode === 'now' ? form.origin_stop_id : '',
    destinationStopId: form.destination_stop_id,
    seatType: form.seat_type,
  });
  const departuresState = useDepartures({
    enabled: bookingMode === 'later',
    originStopId: form.origin_stop_id,
    destinationStopId: form.destination_stop_id,
    date: travelDate,
    seatType: form.seat_type,
  });
  const preferredDepartureId = selectedDepartureId || form.selected_trip_id;
  const selectedDeparture = preferredDepartureId
    ? departuresState.departures.find((item) => String(item.trip_id) === String(preferredDepartureId)) || null
    : (form.booking_time ? departuresState.departures.find((item) => item.boarding_time === form.booking_time) : null)
      || departuresState.departures[0]
      || null;
  const resolution = bookingMode === 'now'
    ? nowResolution
    : {
      trip: selectedDeparture,
      message: preferredDepartureId && !selectedDeparture && !departuresState.loading
        ? 'This trip is no longer available. Choose another departure.'
        : departuresState.message,
      error: departuresState.error,
      loading: departuresState.loading,
      ready: departuresState.ready,
    };
  const trip = resolution.trip;
  // Batch 75: the discounts this bus's Operator offers, which a passenger may claim online (empty when none or unknown).
  const [discountTypes, setDiscountTypes] = useState([]);
  const discountTripId = trip?.trip_id ?? null;
  useEffect(() => {
    if (!discountTripId) return undefined;
    let cancelled = false;
    getTripDiscountTypes(discountTripId)
      .then((types) => { if (!cancelled) setDiscountTypes(Array.isArray(types) ? types : []); })
      .catch(() => { if (!cancelled) setDiscountTypes([]); });
    return () => { cancelled = true; };
  }, [discountTripId]);
  const setDiscountClaim = useCallback((index, key) => {
    setForm((prev) => {
      // Batch 76 / 2026-11-24 (user): a senior or PWD claim sets the matching priority seat; another claim, or none,
      // clears it (a pregnant priority seat stays). The passenger can still change the priority seat afterwards.
      const current = prev.ticket_extras?.[index] || {};
      const priority = priorityAfterClaim(current.priority_type || '', key, priorityTypes, discountTypes);
      const extras = priority === (current.priority_type || '')
        ? prev.ticket_extras
        : { ...prev.ticket_extras, [index]: { ...current, priority_type: priority } };
      return { ...prev, discount_claims: { ...prev.discount_claims, [index]: key || null }, ticket_extras: extras };
    });
  }, [priorityTypes, discountTypes]);
  // Batch 76: one ticket's priority seat ('' for none) or baggage (true / false).
  const setTicketExtra = useCallback((index, field, value) => {
    setForm((prev) => ({
      ...prev,
      ticket_extras: { ...prev.ticket_extras, [index]: { ...(prev.ticket_extras?.[index] || {}), [field]: value } },
    }));
  }, []);

  // The link mirrors the choice: stops, date and (for Book Later) the departure time.
  const linkTime = bookingMode === 'later' && trip ? trip.boarding_time : '';
  useEffect(() => {
    if (!journeyTouchedRef.current) return;
    const next = withBookingParams(searchParams, { from: originCode, to: destinationCode, date: travelDate, time: linkTime });
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [originCode, destinationCode, travelDate, linkTime, searchParams, setSearchParams]);
  const effectiveAlightingStopId = alightingStopId ?? (form.destination_stop_id || null);
  const timelineState = useTripTimeline({
    tripId: trip?.trip_id ?? null,
    boardingStopId: form.origin_stop_id || null,
    alightingStopId: effectiveAlightingStopId,
    seatType: form.seat_type,
  });
  const { timeline } = timelineState;

  // The fare comes from the same server computation the ticket is priced with (D4); it is
  // only usable while the timeline on screen matches the current selection.
  const fareAmount = Number(timeline?.fare?.amount);
  const journeyMatches = Boolean(timeline)
    && String(timeline.journey?.boarding_stop_id ?? '') === String(form.origin_stop_id)
    && String(timeline.journey?.alighting_stop_id ?? '') === String(effectiveAlightingStopId ?? '');
  const canProceedToOnlinePayment = journeyMatches
    && !timelineState.loading
    && !timelineState.error
    && Number.isFinite(fareAmount);
  const unitFare = canProceedToOnlinePayment ? fareAmount : NaN;
  const hasFareQuote = canProceedToOnlinePayment;

  const quantity = Math.max(1, parseInt(form.ticket_quantity, 10) || 1);
  const grossTotal = Number.isFinite(unitFare) ? Number((unitFare * quantity).toFixed(2)) : 0;
  // 2026-11-25 (user): baggage is paid in cash on board, so the online payment is the fares only.
  const baggage = { count: baggageCount(quantity, form.ticket_extras) };
  const payableBeforeRewards = grossTotal;
  const requestedRewardPoints = Math.max(0, parseInt(form.reward_points_to_use, 10) || 0);
  const maxRedeemableByTotal = Math.max(0, Math.floor(payableBeforeRewards - 1));
  const maxRedeemableRewardPoints = Math.min(availableRewardPoints, maxRedeemableByTotal);
  const rewardPointsToApply = form.use_rewards ? Math.min(requestedRewardPoints, maxRedeemableRewardPoints) : 0;
  const isRewardRequestInsufficient = form.use_rewards && requestedRewardPoints > maxRedeemableRewardPoints;
  const netTotal = Number(Math.max(0, payableBeforeRewards - rewardPointsToApply).toFixed(2));
  // Batch 75: the transaction fee at the chosen e-wallet's rate (one per payment, whatever the number of tickets).
  // null until the rates have loaded; the page then says it is not known yet instead of showing a made-up amount.
  const bookingFee = transactionFee(feeRates, form.payment_channel, netTotal);
  const bookingFeeRate = ratePercentLabel(feeRates, form.payment_channel);
  const totalDue = bookingFee === null ? null : Number((netTotal + bookingFee).toFixed(2));
  const hasRewardPoints = availableRewardPoints > 0;

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
  }, []);

  // Changing where/when starts a fresh journey, so the previous alighting choice no longer applies.
  const resetJourneyChoices = useCallback(() => {
    setSelectedDepartureId('');
    setAlightingStopId(null);
  }, []);

  const handleJourneyChange = useCallback((field, value) => {
    journeyTouchedRef.current = true;
    handleChange(field, value);
    handleChange('selected_trip_id', '');
    // A departure picked from the results only applies to the journey it came from.
    if (field !== 'booking_option') handleChange('booking_time', '');
    if (field === 'origin_stop_id') {
      handleChange('destination_stop_id', '');
    }
    resetJourneyChoices();
  }, [handleChange, resetJourneyChoices]);

  // Choosing another departure starts the trip-specific choices over (its direction may differ).
  const selectDeparture = useCallback((tripId) => {
    setAlightingStopId(null);
    journeyTouchedRef.current = true;
    setSelectedDepartureId(String(tripId));
  }, []);

  const selectAlightingStop = useCallback((stopId) => setAlightingStopId(stopId), []);

  const printQrTicket = useCallback((ticket, idx) => {
    if (!ticket?.qr_content) return;

    // The QR is drawn locally (same renderer as the screen); the window opens first so the
    // browser allows it, and is filled once the image is ready.
    // Batch 80: the designer's ticket design, shared with My Tickets (utils/ticketPrint.js).
    openPrintWindow(ticket.qr_content, (qrSrc) => ticketPrintHtml({
      title: `Ticket QR ${idx + 1}`,
      from: ticket.origin,
      to: ticket.destination,
      departure: formatDateTime(ticket.valid_from),
      fare: ticket.amount ?? null,
      status: 'valid',
      ticketId: String(ticket.ticket_uuid || '').slice(0, 8).toUpperCase(),
      traveller: ticket.traveller_name || '',
      rows: ticketExtraRows(ticket),
      qrSrc,
    }));
  }, []);

  const toGuestQrTicket = useCallback((ticket) => {
    const meta = ticketMeta(ticket);

    return {
      ticket_uuid: ticket.ticket_uuid,
      qr_content: ticket.ticket_uuid,
      ...meta,
    };
  }, []);

  const toPassengerTicketCardData = useCallback((ticket) => {
    // Fallback used when a ticket's real QR isn't active yet (for example a future-dated
    // booking) and getTicketQR() can't return the backend's payload. The ticket QR stays
    // inactive (no qr_content); only the group payload is derived so the group section can
    // still render, exactly as before.
    const meta = ticketMeta(ticket);

    return {
      ticket_uuid: ticket.ticket_uuid,
      qr_content: null,
      ...meta,
    };
  }, []);
  const clearPendingCheckout = useCallback(() => {
    setPendingCheckout(null);
    pendingCheckoutRef.current = null;
    localStorage.removeItem(CHECKOUT_PENDING_KEY);
  }, []);

  useEffect(() => {
    pendingCheckoutRef.current = pendingCheckout;
  }, [pendingCheckout]);

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

    // The QR payload itself carries no route text; merge in what the ticket row says.
    const resolvedQr = qrResponses
      .map((qr, i) => (qr ? { ...ticketMeta(matchedTickets[i]), ...qr } : null))
      .filter(Boolean);
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

    // The return page reports what the server has recorded (the webhook is the source of
    // truth): success | pending (still confirming) | failed | expired | refund (Batch 49: paid, but the bus filled up
    // first, so the money is being given back) | cancel.
    const normalized = ['success', 'pending', 'failed', 'expired', 'refund'].includes(status) ? status : 'cancel';
    setCheckoutStatus(normalized);

    if (normalized === 'pending') {
      setError('');
      setSuccess('We are still confirming your payment. Your ticket will appear in My Tickets as soon as it is confirmed.');
      localStorage.removeItem(CHECKOUT_EVENT_KEY);
      return;
    }

    clearCheckoutIdempotencyKey('passenger-online');

    if (normalized === 'success') {
      setSuccess('Payment successful. We will show your ticket QR once it becomes active.');
      setError('');

      let activePending = pendingCheckoutRef.current;
      if (!activePending) {
        try {
          const storedPending = localStorage.getItem(CHECKOUT_PENDING_KEY);
          if (storedPending) {
            activePending = JSON.parse(storedPending);
            setPendingCheckout(activePending);
            pendingCheckoutRef.current = activePending;
          }
        } catch {
          activePending = null;
        }
      }

      if (!activePending) {
        setCheckoutStatus('success');
        localStorage.removeItem(CHECKOUT_PENDING_KEY);
        localStorage.removeItem(CHECKOUT_EVENT_KEY);
        return;
      }

      void (async () => {
        await loadPurchasedQrTickets(activePending);
        onTicketPurchased?.();
        clearPendingCheckout();
        localStorage.removeItem(CHECKOUT_EVENT_KEY);
      })();

      return;
    }

    setSuccess('');
    setQrTickets([]);
    setError({
      failed: 'The payment did not go through. No ticket was issued and you were not charged. You may try again.',
      expired: 'The payment session expired. No ticket was issued. Please start again.',
      refund: 'The bus filled up before your payment went through, so no ticket was issued. Your full payment is being refunded automatically, and we will email you when it is done.',
    }[normalized] || 'Payment was cancelled. No ticket was issued. You may try again.');
    clearPendingCheckout();
    localStorage.removeItem(CHECKOUT_EVENT_KEY);
  }, [onTicketPurchased, loadPurchasedQrTickets, clearPendingCheckout]);


  useEffect(() => {
    if (isGuestCheckout) {
      const timer = setTimeout(() => {
        setAvailableRewardPoints(0);
        setLoadingRewards(false);
      }, 0);
      return () => clearTimeout(timer);
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
    const storedPending = localStorage.getItem(CHECKOUT_PENDING_KEY);
    if (!storedPending) return;

    try {
      const parsedPending = JSON.parse(storedPending);

      // Issue #1 fix: startedAt is now a real Date.now() timestamp (it used
      // to be a per-page-load monotonic counter, which meant a stale flag
      // left behind by an abandoned/crashed checkout tab could never be
      // detected as stale and would be trusted forever on every future page
      // load). Only resume the "pending" UI if the stored session is still
      // within a reasonable window of an actual PayMongo checkout session.
      const startedAt = Number(parsedPending?.startedAt) || 0;
      const age = Date.now() - startedAt;
      if (!startedAt || age < 0 || age > CHECKOUT_PENDING_TTL_MS) {
        localStorage.removeItem(CHECKOUT_PENDING_KEY);
        localStorage.removeItem(CHECKOUT_EVENT_KEY);
        return;
      }

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
    if (checkoutStatus !== 'pending') return undefined;

    const timer = setInterval(() => {
      const storedEvent = localStorage.getItem(CHECKOUT_EVENT_KEY);
      if (!storedEvent) return;

      try {
        const payload = JSON.parse(storedEvent);
        if (payload?.status) {
          handleCheckoutResult(payload.status, payload.timestamp);
        }
      } catch {
        // Ignore malformed payloads.
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [checkoutStatus, handleCheckoutResult]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    setError('');
    setFormErrors({});
    setSuccess('');
    setIsSubmitting(true);

    try {
      const nextErrors = {};

      if (!trip?.trip_id) {
        nextErrors.trip = 'Choose where you are going and when so we can find your bus.';
      }
      if (!form.origin_stop_id) {
        nextErrors.origin_stop_id = 'Please choose where you board.';
      }
      // Batch 50 item 7 (user): a guest's ticket and tracking code are sent by email, so the email is required.
      if (isGuestCheckout && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.guest_email || '').trim())) {
        nextErrors.guest_email = 'Enter your email. Your ticket and tracking code are sent there.';
      }
      if (form.for_someone_else) {
        if (!String(form.traveller_name || '').trim()) nextErrors.traveller_name = 'Enter the name of the person you are booking for.';
        if (!normalizeContact(form.traveller_contact)) nextErrors.traveller_contact = 'Enter their email, or a mobile number like 09171234567.';
      }
      if (!Number.isFinite(parseInt(form.ticket_quantity, 10)) || parseInt(form.ticket_quantity, 10) < 1) {
        nextErrors.ticket_quantity = 'Ticket quantity must be at least 1.';
      } else if (parseInt(form.ticket_quantity, 10) > maxSeatsPerPurchase) {
        nextErrors.ticket_quantity = `You can buy up to ${maxSeatsPerPurchase} tickets in one purchase.`;
      }
      if (!effectiveAlightingStopId) {
        nextErrors.destination_stop_id = 'Please choose where you get off.';
      }
      if (!canProceedToOnlinePayment) {
        nextErrors.payment = 'Your fare is not ready yet. Check the journey above and try again.';
      }
      if (form.use_rewards && isRewardRequestInsufficient) {
        nextErrors.reward_points_to_use = `You do not have enough reward points for this booking. You can use up to ${maxRedeemableRewardPoints} points now.`;
      }

      if (Object.keys(nextErrors).length > 0) {
        setFormErrors(nextErrors);
        return;
      }

      const itemPayload = {
        trip_id: trip.trip_id,
        seat_type: form.seat_type,
        origin_stop_id: parseInt(form.origin_stop_id, 10),
        destination_stop_id: parseInt(effectiveAlightingStopId, 10),
      };

      const payload = {
        items: itemsWithExtras(itemsWithClaims(itemPayload, quantity, form.discount_claims, discountTypes), form.ticket_extras, priorityTypes),
        booking_date: trip.trip_date,
        return_base_url: window.location.origin,
        payment_channel: form.payment_channel,
        email_group_qr: quantity > 1 ? form.email_group_qr !== false : true,
      };
      // Only a guest is asked for an email, and only so we can find their ticket again;
      // the payment page collects everything else.
      if (isGuestCheckout) payload.guest_email = String(form.guest_email).trim();
      // Batch 51 item 7: the ticket still goes to the buyer's email; the traveller is named on it.
      if (form.for_someone_else) {
        payload.traveller_name = String(form.traveller_name).trim();
        payload.traveller_contact = normalizeContact(form.traveller_contact);
      }
      if (!isGuestCheckout && form.use_rewards && rewardPointsToApply > 0) {
        payload.reward_points_to_use = rewardPointsToApply;
      }

      const idempotencyKey = checkoutIdempotencyKey('passenger-online', payload);
      const res = await PassengerService.checkoutOnline(payload, idempotencyKey);
      const checkoutUrl = res?.data?.checkout_url || res?.checkout_url || null;

      const paymentPayload = res?.data?.payment || res?.payment || {};
      const checkoutMeta = {
        paymentId: paymentPayload?.payment_id ?? null,
        transactionReference: paymentPayload?.transaction_reference ?? null,
        guestEmail: isGuestCheckout ? (form.guest_email || null) : null,
        returnPath: `${window.location.pathname}${window.location.search}`,
        // Real epoch-ms timestamp so a stale/abandoned pending flag can be detected on a later load.
        startedAt: Date.now(),
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

      setSuccess('Secure checkout opened in a new tab. Finish paying there, then come back to this page.');
    } catch (err) {
      // §12: on a 422, or when the server says the earlier attempt is over, the next tap starts a fresh checkout.
      if (shouldDropCheckoutKey(err)) clearCheckoutIdempotencyKey('passenger-online');
      setError(err.response?.data?.errors ? readApiError(err).message : err.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canProceedToOnlinePayment,
    discountTypes,
    effectiveAlightingStopId,
    form.discount_claims,
    form.ticket_extras,
    form.email_group_qr,
    form.guest_email,
    form.for_someone_else,
    form.traveller_name,
    form.traveller_contact,
    form.origin_stop_id,
    form.payment_channel,
    form.seat_type,
    form.ticket_quantity,
    form.use_rewards,
    isGuestCheckout,
    isRewardRequestInsufficient,
    maxRedeemableRewardPoints,
    maxSeatsPerPurchase,
    priorityTypes,
    quantity,
    rewardPointsToApply,
    trip,
  ]);

  return {
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
    discountTypes,
    setDiscountClaim,
    priorityTypes,
    baggageOnBoard,
    baggage,
    setTicketExtra,
    maxSeatsPerPurchase,
    totalDue,
    printQrTicket,
    qrTickets,
    resolution,
    rewardPointsToApply,
    selectAlightingStop,
    selectDeparture,
    travelDate,
    stopsData,
    success,
    timelineState,
    totalTickets: quantity,
    trip,
    unitFare,
  };
}
