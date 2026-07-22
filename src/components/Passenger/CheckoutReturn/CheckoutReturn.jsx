import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function CheckoutReturn() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const status = location.pathname.includes('/checkout/success') ? 'success' : 'cancel';
    navigate(`/passenger/dashboard?payment=${status}`, { replace: true });
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-6 py-5 text-center text-sm text-slate-300">
        Redirecting back to your trip dashboard...
      </div>
    </div>
  );
}
