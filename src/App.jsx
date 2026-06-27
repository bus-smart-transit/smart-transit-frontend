import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DefaultLayout from './layouts/default';
import PassengerBaseRouter from './pages/passenger'; // 👈 Points directly to the index.jsx file

// Keep the global public landing page import here since it sits at the root domain '/'
import LandingPage from './pages/passenger/index';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── PUBLIC ACCESS ROUTES ── */}
        <Route element={<DefaultLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>
        <Route path="/passenger/*" element={<PassengerBaseRouter />} />

        {/* Catch-all redirect back to the entry root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}