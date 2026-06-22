import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DefaultLayout from './layouts/default';
import LandingPage from './components/Passenger/LandingPage/LandingPage';
import SignUpPage from './components/Passenger/SignupPage/SignupPage';
import LoginPage from './components/Passenger/LoginPage/LoginPage';
import { ProtectedRoute, GuestRoute } from './components/AuthGuard'; // 👈 Import guards

// Placeholder for protected passenger dashboard
function PassengerDashboard() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
      color: '#f1f5f9',
      fontFamily: 'Inter, sans-serif',
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>🚌 Passenger Dashboard</h1>
      <p style={{ color: '#64748b' }}>You are logged in! Dashboard coming soon.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Shared Shell Layout */}
        <Route element={<DefaultLayout />}>
          <Route path="/" element={<LandingPage />} />

          {/* ── GUEST ONLY ROUTES ── */}
          <Route element={<GuestRoute />}>
            <Route path="/passenger/signup" element={<SignUpPage />} />
            <Route path="/passenger/login" element={<LoginPage />} />
          </Route>
        </Route>

        {/* ── PROTECTED PASSENGER ROUTES ── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/passenger/dashboard" element={<PassengerDashboard />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}