import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { getPaymentStatus } from '../../../services/bookingService';
import { nextCheckDelay } from '../../../utils/checkoutPolling';

const CHECKOUT_EVENT_KEY = 'smart_transit_checkout_event';
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20;

const COPY = {
  checking: {
    title: 'Confirming your payment...',
    body: 'Please wait while we confirm your payment with the payment provider.',
  },
  success: {
    title: 'Payment Completed',
    body: 'Your payment is confirmed. Your ticket QR is on the original booking tab and under My Tickets.',
  },
  pending: {
    title: 'Still Confirming',
    body: 'We have not received the final result yet. Nothing more is needed from you: your ticket will appear in My Tickets as soon as the payment is confirmed.',
  },
  failed: {
    title: 'Payment Failed',
    body: 'The payment did not go through. No ticket was issued and you were not charged. You may try again from the booking page.',
  },
  expired: {
    title: 'Payment Session Expired',
    body: 'The payment session ran out of time and the held seats were released. Please start a new booking.',
  },
  cancel: {
    title: 'Payment Cancelled',
    body: 'You cancelled the payment. No ticket was issued. You may try again from the booking page.',
  },
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The return URL never decides whether a payment succeeded; the webhook does.
 * This page only asks the server what it has recorded and shows that, polling for
 * a short while when the provider redirected back before the webhook arrived.
 */
export default function CheckoutReturn() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('ref');
  const returnedAs = useMemo(
    () => (location.pathname.includes('/checkout/success') ? 'success' : 'cancel'),
    [location.pathname],
  );
  const [outcome, setOutcome] = useState('checking');
  const [recheck, setRecheck] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const resolveOutcome = async () => {
      // Without a reference we cannot ask the server; report what the redirect said, unconfirmed.
      if (!reference) return returnedAs === 'success' ? 'pending' : 'cancel';

      const attempts = returnedAs === 'success' ? POLL_MAX_ATTEMPTS : 1;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        let delay = POLL_INTERVAL_MS;
        try {
          const status = await getPaymentStatus(reference);
          if (status?.status === 'paid') return 'success';
          if (status?.status === 'failed') return 'failed';
          if (status?.status === 'expired') return 'expired';
        } catch (error) {
          // Not yet known: keep trying, later when the server said "too many requests".
          delay = nextCheckDelay(error, POLL_INTERVAL_MS);
        }
        if (cancelled) return null;
        if (attempt < attempts) await wait(delay);
        if (cancelled) return null;
      }
      return returnedAs === 'success' ? 'pending' : 'cancel';
    };

    void (async () => {
      const result = await resolveOutcome();
      if (cancelled || !result) return;
      setOutcome(result);

      const eventPayload = { status: result, timestamp: Date.now() };
      localStorage.setItem(CHECKOUT_EVENT_KEY, JSON.stringify(eventPayload));

      if (window.opener && !window.opener.closed) {
        try {
          window.opener.localStorage.setItem(CHECKOUT_EVENT_KEY, JSON.stringify(eventPayload));
          window.opener.focus();
        } catch {
          // If opener access fails, leave manual actions visible.
        }
        // Let the passenger read the result, then hand back to the booking tab.
        if (result !== 'pending') window.setTimeout(() => window.close(), 2500);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reference, returnedAs, recheck]);

  const copy = COPY[outcome] || COPY.checking;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-6 py-5 text-center text-sm text-slate-300 max-w-md w-full" role="status" aria-live="polite">
        <h1 className="text-base font-semibold text-slate-100 mb-2">{copy.title}</h1>
        <p className="mb-4">{copy.body}</p>
        <div className="flex items-center justify-center gap-3">
          {outcome === 'pending' && reference && (
            <button
              type="button"
              onClick={() => { setOutcome('checking'); setRecheck((n) => n + 1); }}
              className="rounded-lg border border-sky-500 px-3 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/10"
            >
              Check again
            </button>
          )}
          <button
            type="button"
            onClick={() => window.close()}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs hover:border-slate-500"
          >
            Close This Tab
          </button>
          <Link to="/passenger/dashboard?tab=tickets" className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400">
            Open My Tickets
          </Link>
          {(outcome === 'failed' || outcome === 'expired' || outcome === 'cancel') && (
            <Link to="/passenger/book" className="rounded-lg border border-slate-700 px-3 py-2 text-xs hover:border-slate-500">
              Book Again
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
