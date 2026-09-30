import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BuyTicket from './BuyTicket';
import { useAuth } from '../../../api/hooks/useAuth';

/**
 * The one booking page. Guests and signed-in passengers land here from every "book" entry point
 * (home search, dashboard, checkout return); only the top-right link differs.
 */
export default function BuyTicketPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/passenger#search-trips" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 transition hover:text-navy-950">
            <ArrowLeft size={16} aria-hidden="true" /> Back to Search
          </Link>
          <h1 className="font-display text-base font-bold text-navy-950 sm:text-lg">Trip Details and Payment</h1>
          {isAuthenticated ? (
            <Link to="/passenger/dashboard" className="text-sm font-semibold text-navy-800 transition hover:text-navy-950">My Dashboard</Link>
          ) : (
            <Link to="/passenger/login" className="text-sm font-semibold text-navy-800 transition hover:text-navy-950">Sign in</Link>
          )}
        </div>
      </header>

      <BuyTicket />
    </div>
  );
}
