import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import BuyTicket from './BuyTicket';
import { useAuth } from '../../../api/hooks/useAuth';
import { bookingReturnPath } from '../../../utils/bookingQuery';

// 2026-11-24 (user): where the passenger is in booking. Search is done; payment happens on the provider's page and the
// confirmation comes back here.
const STEPS = ['Search', 'Trip details', 'Payment', 'Confirm'];
const CURRENT_STEP = 1;

/**
 * The one booking page. Guests and signed-in passengers land here from every "book" entry point
 * (home search, dashboard, checkout return); only the top-right link differs.
 */
export default function BuyTicketPage() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const returnTo = bookingReturnPath(location.state);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            to={returnTo}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-navy-800 transition hover:bg-slate-50 hover:text-navy-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700/30"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back to Search
          </Link>
          <h1 className="min-w-0 truncate text-center font-display text-base font-bold text-navy-950 sm:text-xl"><span className="sm:hidden">Trip details</span><span className="hidden sm:inline">Trip Details and Payment</span></h1>
          {isAuthenticated ? (
            <Link to="/passenger/dashboard" className="shrink-0 text-sm font-semibold text-navy-800 transition hover:text-navy-950">My Dashboard</Link>
          ) : (
            <Link to="/passenger/login" className="shrink-0 text-sm font-semibold text-navy-800 transition hover:text-navy-950">Sign in</Link>
          )}
        </div>
        <nav aria-label="Booking steps" className="mx-auto w-full max-w-6xl px-4 pb-3 sm:px-6">
          <ol className="flex items-center gap-2 text-sm">
            {STEPS.map((step, index) => {
              const done = index < CURRENT_STEP;
              const current = index === CURRENT_STEP;
              return (
                <li key={step} className="flex min-w-0 items-center gap-2" aria-current={current ? 'step' : undefined}>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done ? 'bg-teal-600 text-white' : current ? 'bg-navy-800 text-white' : 'border border-slate-300 text-slate-500'
                    }`}
                    aria-hidden="true"
                  >
                    {done ? <Check size={14} strokeWidth={3} /> : index + 1}
                  </span>
                  <span className={`${current ? 'font-semibold text-navy-950' : 'hidden text-slate-500 sm:inline'}`}>
                    {step}
                    {done && <span className="sr-only"> (done)</span>}
                  </span>
                  {index < STEPS.length - 1 && <span className={`h-px w-4 shrink-0 sm:w-10 ${done ? 'bg-teal-600' : 'bg-slate-300'}`} aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
        </nav>
      </header>

      <BuyTicket returnTo={returnTo} accountEmail={isAuthenticated ? user?.email || '' : ''} />
    </div>
  );
}
