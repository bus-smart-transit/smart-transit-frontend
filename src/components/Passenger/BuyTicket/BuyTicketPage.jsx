import { Link } from 'react-router-dom';
import BuyTicket from './BuyTicket';

export default function BuyTicketPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto mb-4 flex w-full max-w-7xl items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-300">Passenger Booking</p>
          <h1 className="text-2xl font-bold text-white">Search Trips and Continue to Payment</h1>
        </div>
        <Link
          to="/passenger"
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
        >
          Back to Landing
        </Link>
      </div>

      <div className="mx-auto w-full max-w-7xl">
        <BuyTicket />
      </div>
    </div>
  );
}
