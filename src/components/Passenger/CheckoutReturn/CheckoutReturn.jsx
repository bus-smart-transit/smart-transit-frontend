import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

const CHECKOUT_EVENT_KEY = 'smart_transit_checkout_event';

export default function CheckoutReturn() {
  const location = useLocation();
  const status = useMemo(
    () => (location.pathname.includes('/checkout/success') ? 'success' : 'cancel'),
    [location.pathname],
  );

  useEffect(() => {
    const eventPayload = {
      status,
      timestamp: Date.now(),
    };

    localStorage.setItem(
      CHECKOUT_EVENT_KEY,
      JSON.stringify(eventPayload),
    );

    if (window.opener && !window.opener.closed) {
      try {
        window.opener.localStorage.setItem(CHECKOUT_EVENT_KEY, JSON.stringify(eventPayload));
        window.opener.focus();
      } catch {
        // If opener access fails, leave manual actions visible.
      }

      const closeTimer = window.setTimeout(() => {
        window.close();
      }, 300);

      return () => window.clearTimeout(closeTimer);
    }
  }, [status]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-6 py-5 text-center text-sm text-slate-300 max-w-md w-full">
        <h1 className="text-base font-semibold text-slate-100 mb-2">
          {status === 'success' ? 'Payment Completed' : 'Payment Not Completed'}
        </h1>
        <p className="mb-4">
          The original booking tab has been updated with your payment result.
          {status === 'success' ? ' You can view your ticket QR there.' : ' You may retry checkout there.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.close()}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs hover:border-slate-500"
          >
            Close This Tab
          </button>
          <Link to="/passenger/dashboard" className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400">
            Open Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
