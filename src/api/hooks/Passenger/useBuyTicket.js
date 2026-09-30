import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import PassengerService from '../../PassengerService/PassengerService';
import { readApiError } from '../../../services/bookingService';
import { useBookingStops, useTripResolution } from './useBookingSearch';
import useTripTimeline from './useTripTimeline';
import { groupQrPayload, openPrintWindow } from '../../../utils/qr';
import { manilaDepartureLabel } from '../../../utils/ticketImage';
const CHECKOUT_EVENT_KEY = 'smart_transit_checkout_event';
const CHECKOUT_PENDING_KEY = 'smart_transit_checkout_pending';
const CHECKOUT_LOOKUP_CACHE_KEY = 'smart_transit_checkout_lookup_cache_v1';
const TICKET_QR_CACHE_KEY = 'smart_transit_ticket_qr_cache_v1';
const LOOKUP_CACHE_TTL_MS = 60 * 1000;
const QR_CACHE_TTL_MS = 5 * 60 * 1000;
// PayMongo checkout sessions are short-lived; treat a pending-checkout flag
// older than this as abandoned/stale rather than trusting it forever.
const CHECKOUT_PENDING_TTL_MS = 30 * 60 * 1000;


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
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} - ${hh}:${min}`;
};

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

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
    trip_date: ticket?.trip_date ?? ticket?.trip?.trip_date ?? null,
    departure_time: ticket?.departure_time ?? ticket?.trip?.departure_time ?? null,
    valid_from: ticket?.valid_from ?? null,
    expires_at: ticket?.expires_at ?? null,
  };
};

export default function useBuyTicket({ onTicketPurchased }) {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});
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

  // The journey a passenger describes: where from, where to, and when. A landing
  // page search can hand these over through the query string.
  const [form, setForm] = useState(() => ({
    origin_stop_id: searchParams.get('origin_stop_id') || '',
    destination_stop_id: searchParams.get('destination_stop_id') || '',
    booking_option: searchParams.get('mode') === 'later' ? 'later' : 'now',
    booking_date: searchParams.get('date') || '',
    booking_time: searchParams.get('time') || '',
    seat_type: 'seated',
    payment_channel: 'gcash',
    ticket_quantity: '1',
    use_rewards: false,
    reward_points_to_use: '',
    guest_email: '',
  }));
  // null = follow the destination the passenger searched for; a stop id = picked on the timeline.
  const [alightingStopId, setAlightingStopId] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [dropoffDraft, setDropoffDraft] = useState(null);
  const [dropoffModalOpen, setDropoffModalOpen] = useState(false);

  const stopsData = useBookingStops(form.origin_stop_id);
  const resolution = useTripResolution({
    mode: form.booking_option,
    originStopId: form.origin_stop_id,
    destinationStopId: form.destination_stop_id,
    date: form.booking_date,
    time: form.booking_time,
    seatType: form.seat_type,
  });
  const trip = resolution.trip;

  const effectiveAlightingStopId = dropoff ? null : (alightingStopId ?? (form.destination_stop_id || null));
  const timelineState = useTripTimeline({
    tripId: trip?.trip_id ?? null,
    boardingStopId: form.origin_stop_id || null,
    alightingStopId: effectiveAlightingStopId,
    dropoff,
    seatType: form.seat_type,
  });
  const { timeline } = timelineState;

  // The fare comes from the same server computation the ticket is priced with (D4); it is
  // only usable while the timeline on screen matches the current selection.
  const fareAmount = Number(timeline?.fare?.amount);
  const journeyMatches = Boolean(timeline)
    && String(timeline.journey?.boarding_stop_id ?? '') === String(form.origin_stop_id)
    && (dropoff
      ? timeline.journey?.custom_dropoff === true
      : String(timeline.journey?.alighting_stop_id ?? '') === String(effectiveAlightingStopId ?? ''));
  const canProceedToOnlinePayment = journeyMatches
    && !timelineState.loading
    && !timelineState.error
    && Number.isFinite(fareAmount);
  const unitFare = canProceedToOnlinePayment ? fareAmount : NaN;
  const hasFareQuote = canProceedToOnlinePayment;

  const dropoffAccepted = Boolean(dropoff) && journeyMatches && !timelineState.loading && !timelineState.error;
  const dropoffError = dropoff && !timelineState.loading
    ? (timelineState.error?.fieldErrors?.dropoff?.[0] || timelineState.error?.message || '')
    : '';

  const quantity = Math.max(1, parseInt(form.ticket_quantity, 10) || 1);
  const grossTotal = Number.isFinite(unitFare) ? Number((unitFare * quantity).toFixed(2)) : 0;
  const requestedRewardPoints = Math.max(0, parseInt(form.reward_points_to_use, 10) || 0);
  const maxRedeemableByTotal = Math.max(0, Math.floor(grossTotal - 1));
  const maxRedeemableRewardPoints = Math.min(availableRewardPoints, maxRedeemableByTotal);
  const rewardPointsToApply = form.use_rewards ? Math.min(requestedRewardPoints, maxRedeemableRewardPoints) : 0;
  const isRewardRequestInsufficient = form.use_rewards && requestedRewardPoints > maxRedeemableRewardPoints;
  const netTotal = Number(Math.max(0, grossTotal - rewardPointsToApply).toFixed(2));
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

  // Changing where/when starts a fresh journey: the previous alighting choice and pin no longer apply.
  const resetJourneyChoices = useCallback(() => {
    setAlightingStopId(null);
    setDropoff(null);
    setDropoffDraft(null);
    setDropoffModalOpen(false);
  }, []);

  const handleJourneyChange = useCallback((field, value) => {
    handleChange(field, value);
    if (field === 'origin_stop_id') {
      handleChange('destination_stop_id', '');
    }
    resetJourneyChoices();
  }, [handleChange, resetJourneyChoices]);

  const selectAlightingStop = useCallback((stopId) => {
    setDropoff(null);
    setAlightingStopId(stopId);
  }, []);

  const openDropoffModal = useCallback(() => {
    setDropoff(null);
    setDropoffModalOpen(true);
  }, []);

  const applyDropoff = useCallback(() => {
    if (dropoffDraft) setDropoff({ lat: dropoffDraft.lat, lng: dropoffDraft.lng, label: dropoffDraft.label || '' });
  }, [dropoffDraft]);

  const closeDropoffModal = useCallback(() => {
    setDropoffModalOpen(false);
    setDropoff(null);
  }, []);

  const clearDropoff = useCallback(() => {
    setDropoff(null);
    setDropoffDraft(null);
    setDropoffModalOpen(false);
  }, []);

  const printQrTicket = useCallback((ticket, idx) => {
    if (!ticket?.qr_content) return;
    const esc = escapeHtml;

    // The QR is drawn locally (same renderer as the screen); the window opens first so the
    // browser allows it, and is filled once the image is ready.
    openPrintWindow(ticket.qr_content, (qrSrc) => `
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
              <h1>${esc(ticket.origin || '')}</h1>
              <h2>${esc(ticket.destination || '')}</h2>
              <div class="strip">
                <div><span>Departure</span><strong>${esc(manilaDepartureLabel(ticket))}</strong></div>
                <div><span>Seat</span><strong>${esc(ticket.seat_type || '-')}</strong></div>
                <div><span>Ticket ID</span><strong>${esc(String(ticket.ticket_uuid || '').slice(0, 8).toUpperCase())}</strong></div>
              </div>
            </header>
            <div class="body">
              <div class="qr-wrap"><img src="${qrSrc}" alt="Ticket QR" /></div>
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
    // truth): success | pending (still confirming) | failed | expired | cancel.
    const normalized = ['success', 'pending', 'failed', 'expired'].includes(status) ? status : 'cancel';
    setCheckoutStatus(normalized);

    if (normalized === 'pending') {
      setError('');
      setSuccess('We are still confirming your payment. Your ticket will appear in My Tickets as soon as it is confirmed.');
      localStorage.removeItem(CHECKOUT_EVENT_KEY);
      return;
    }

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
      expired: 'The payment session expired and the seats were released. Please start again.',
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
      if (!Number.isFinite(parseInt(form.ticket_quantity, 10)) || parseInt(form.ticket_quantity, 10) < 1) {
        nextErrors.ticket_quantity = 'Ticket quantity must be at least 1.';
      }
      if (!dropoff && !effectiveAlightingStopId) {
        nextErrors.destination_stop_id = 'Please choose where you get off.';
      }
      if (!canProceedToOnlinePayment) {
        nextErrors.payment = 'Your fare is not ready yet. Check the journey above and try again.';
      }
      if (form.use_rewards && isRewardRequestInsufficient) {
        nextErrors.reward_points_to_use = `Insufficient reward points for this booking. Max usable now: ${maxRedeemableRewardPoints} RP.`;
      }

      if (Object.keys(nextErrors).length > 0) {
        setFormErrors(nextErrors);
        return;
      }

      const itemPayload = {
        trip_id: trip.trip_id,
        seat_type: form.seat_type,
        origin_stop_id: parseInt(form.origin_stop_id, 10),
        ...(dropoff
          ? {
            // The server re-validates and snaps the pin; only the raw point is sent.
            destination_lat: dropoff.lat,
            destination_lng: dropoff.lng,
            destination_label: (dropoff.label || '').trim() || undefined,
          }
          : { destination_stop_id: parseInt(effectiveAlightingStopId, 10) }),
      };

      const payload = {
        items: Array.from({ length: quantity }, () => ({ ...itemPayload })),
        booking_date: trip.trip_date,
        return_base_url: window.location.origin,
        payment_channel: form.payment_channel,
      };
      // Only a guest is asked for an email, and only so we can find their ticket again;
      // the payment page collects everything else.
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
      setError(err.response?.data?.errors ? readApiError(err).message : err.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canProceedToOnlinePayment,
    dropoff,
    effectiveAlightingStopId,
    form.guest_email,
    form.origin_stop_id,
    form.payment_channel,
    form.seat_type,
    form.ticket_quantity,
    form.use_rewards,
    isGuestCheckout,
    isRewardRequestInsufficient,
    maxRedeemableRewardPoints,
    quantity,
    rewardPointsToApply,
    trip,
  ]);

  return {
    availableRewardPoints,
    canProceedToOnlinePayment,
    checkoutStatus,
    closeDropoffModal,
    clearDropoff,
    applyDropoff,
    dropoff,
    dropoffDraft,
    dropoffError,
    dropoffModalVisible: dropoffModalOpen && !dropoffAccepted,
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
    setDropoffDraft,
    stopsData,
    success,
    timelineState,
    totalTickets: quantity,
    trip,
    unitFare,
  };
}
