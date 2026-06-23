import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DefaultLayout from './layouts/default';
import { ProtectedRoute, GuestRoute } from './components/AuthGuard';

// ── CLEAN PAGE LEVEL IMPORTS ──
import LandingPage from './pages/passenger/landingpage';
import SignUpPage from './pages/passenger/signup';
import LoginPage from './pages/passenger/login';
import PassengerDashboard from './pages/passenger/dashboard'; // 👈 Your main dashboard panel component

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── PUBLIC ACCESS ROUTES ── */}
        <Route element={<DefaultLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>

        {/* ── GUEST ONLY ROUTES (Redirects authenticated users) ── */}
        <Route element={<GuestRoute />}>
          <Route path="/passenger/signup" element={<SignUpPage />} />
          <Route path="/passenger/login" element={<LoginPage />} />
        </Route>

        {/* ── PROTECTED PASSENGER ROUTE ── */}
        <Route element={<ProtectedRoute />}>
          {/* Letting /passenger/dashboard handle everything. 
            Inside your dashboard component, your sidebar buttons can switch state views 
            dynamically between the Live Map, QR tickets, and User settings seamlessly!
          */}
          <Route path="/passenger/dashboard" element={<PassengerDashboard />} />
        </Route>

        {/* Catch-all redirect back to the entry root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}