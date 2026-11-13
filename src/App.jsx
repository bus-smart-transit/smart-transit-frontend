import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './api/hooks/contexts/AuthProvider';
import ErrorBoundary from './components/Layout/ErrorBoundary';

import { SkeletonPage } from './components/ui/Skeleton';
import { pageVariantForPath } from './utils/skeletonVariant';
// DefaultLayout is retained for future public pages but not used by LandingPage,
// which is now self-contained with its own Navbar and Footer.
const PassengerBaseRouter = lazy(() => import('./pages/passenger'));
const EmployeeBaseRouter = lazy(() => import('./pages/employee'));
const LandingPage = lazy(() => import('./components/Passenger/LandingPage/LandingPage'));
const CheckoutReturn = lazy(() => import('./components/Passenger/CheckoutReturn/CheckoutReturn'));
const AboutPage = lazy(() => import('./components/Passenger/About/AboutPage'));
const TrackBusPage = lazy(() => import('./components/Passenger/Track/TrackBusPage'));
const TrackLookupPage = lazy(() => import('./components/Passenger/Track/TrackLookupPage'));
const TrackBusPublicPage = lazy(() => import('./components/Passenger/Track/TrackBusPublicPage'));
const FaqPage = lazy(() => import('./components/Passenger/Faq/FaqPage'));
const ContactPage = lazy(() => import('./components/Passenger/Contact/ContactPage'));
const LegalPage = lazy(() => import('./components/Passenger/Legal/LegalPage'));

// 2026-11-06: sample Privacy Policy and Terms for the test period (same navbar and footer as About).
function LegalWithAuth({ kind }) {
  return (
    <AuthProvider role="passenger">
      <LegalPage kind={kind} />
    </AuthProvider>
  );
}

function LandingWithAuth() {
  return (
    <AuthProvider role="passenger">
      <LandingPage />
    </AuthProvider>
  );
}

// 2026-11-07 (passenger redesign): the Contact page (a sample for the test period).
function ContactWithAuth() {
  return (
    <AuthProvider role="passenger">
      <ContactPage />
    </AuthProvider>
  );
}

// 2026-11-07 (passenger redesign): the FAQ page.
function FaqWithAuth() {
  return (
    <AuthProvider role="passenger">
      <FaqPage />
    </AuthProvider>
  );
}

// 2026-11-06 (passenger redesign): the public Track Bus page (the live map moved here from the homepage).
function TrackBusPublicWithAuth() {
  return (
    <AuthProvider role="passenger">
      <TrackBusPublicPage />
    </AuthProvider>
  );
}

function AboutWithAuth() {
  return (
    <AuthProvider role="passenger">
      <AboutPage />
    </AuthProvider>
  );
}

function RouteFallback() {
  return (
    <SkeletonPage variant={pageVariantForPath()} label="Loading transit view..." />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* LandingPage is self-contained — no layout wrapper needed */}
            <Route path="/" element={<LandingWithAuth />} />
            <Route path="/about" element={<AboutWithAuth />} />
            <Route path="/privacy" element={<LegalWithAuth kind="privacy" />} />
            <Route path="/terms" element={<LegalWithAuth kind="terms" />} />
            <Route path="/faq" element={<FaqWithAuth />} />
            <Route path="/contact" element={<ContactWithAuth />} />
            <Route path="/track-bus" element={<TrackBusPublicWithAuth />} />
            {/* Public: the link itself is the credential, so no account or auth provider is involved. */}
            <Route path="/track" element={<TrackLookupPage />} />
            <Route path="/track/:token" element={<TrackBusPage />} />

            <Route path="/passenger/*" element={<PassengerBaseRouter />} />
            <Route path="/checkout/success" element={<CheckoutReturn />} />
            <Route path="/checkout/cancel" element={<CheckoutReturn />} />
            <Route path="/employee/*" element={<EmployeeBaseRouter />} />
            <Route path="/staff/*" element={<Navigate to="/employee/login" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}