import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './api/hooks/contexts/AuthProvider';

// DefaultLayout is retained for future public pages but not used by LandingPage,
// which is now self-contained with its own Navbar and Footer.
const PassengerBaseRouter = lazy(() => import('./pages/passenger'));
const EmployeeBaseRouter = lazy(() => import('./pages/employee'));
const LandingPage = lazy(() => import('./components/Passenger/LandingPage/LandingPage'));
const CheckoutReturn = lazy(() => import('./components/Passenger/CheckoutReturn/CheckoutReturn'));

function LandingWithAuth() {
  return (
    <AuthProvider role="passenger">
      <LandingPage />
    </AuthProvider>
  );
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-300">
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm">Loading transit view...</div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* LandingPage is self-contained — no layout wrapper needed */}
          <Route path="/" element={<LandingWithAuth />} />

          <Route path="/passenger/*" element={<PassengerBaseRouter />} />
          <Route path="/checkout/success" element={<CheckoutReturn />} />
          <Route path="/checkout/cancel" element={<CheckoutReturn />} />
          <Route path="/employee/*" element={<EmployeeBaseRouter />} />
          <Route path="/staff/*" element={<Navigate to="/employee/login" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}