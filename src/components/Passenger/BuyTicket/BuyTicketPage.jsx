import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BuyTicket from './BuyTicket';
import { useAuth } from '../../../api/hooks/useAuth';
import { bookingReturnPath } from '../../../utils/bookingQuery';

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
      </header>

      <BuyTicket returnTo={returnTo} accountEmail={isAuthenticated ? user?.email || '' : ''} />
    </div>
  );
}
