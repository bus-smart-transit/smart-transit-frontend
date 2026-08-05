import { Routes, Route } from "react-router-dom";
import RequireAuth from "./components/RequireAuth.jsx";

import HomePage from "./pages/Home/HomePage.jsx";
import AboutPage from "./pages/About/AboutPage.jsx";
import NewsPage from "./pages/News/NewsPage.jsx";
import FaqPage from "./pages/Faq/FaqPage.jsx";
import ContactPage from "./pages/Contact/ContactPage.jsx";
import LoginPage from "./pages/Auth/LoginPage.jsx";
import SignupPage from "./pages/Auth/SignupPage.jsx";

import DashboardPage from "./pages/Dashboard/DashboardPage.jsx";
import MyTicketsPage from "./pages/MyTickets/MyTicketsPage.jsx";
import TripHistoryPage from "./pages/TripHistory/TripHistoryPage.jsx";
import TrackBusPage from "./pages/TrackBus/TrackBusPage.jsx";
import RewardsPage from "./pages/Rewards/RewardsPage.jsx";
import ProfilePage from "./pages/Profile/ProfilePage.jsx";

import TripResultsPage from "./pages/Booking/TripResultsPage.jsx";
import SeatSelectionPage from "./pages/Booking/SeatSelectionPage.jsx";
import PaymentPage from "./pages/Booking/PaymentPage.jsx";
import GCashPlaceholderPage from "./pages/Booking/GCashPlaceholderPage.jsx";
import ConfirmationPage from "./pages/Booking/ConfirmationPage.jsx";

// Main router for the app. Each page lives in its own folder under
// src/pages/ -- see each folder for the components that make it up.
export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Track Bus is reachable by guests and passengers alike -- it
          renders its own layout depending on auth state. */}
      <Route path="/track-bus" element={<TrackBusPage />} />

      {/* Passenger dashboard + sidebar pages -- reached only via the
          navbar's account dropdown once signed in, never automatically. */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/my-tickets"
        element={
          <RequireAuth>
            <MyTicketsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/trip-history"
        element={
          <RequireAuth>
            <TripHistoryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/rewards"
        element={
          <RequireAuth>
            <RewardsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />

      {/* Booking flow: search -> seats -> payment -> gcash -> confirmation */}
      <Route
        path="/booking"
        element={
          <RequireAuth>
            <TripResultsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/booking/seats"
        element={
          <RequireAuth>
            <SeatSelectionPage />
          </RequireAuth>
        }
      />
      <Route
        path="/booking/payment"
        element={
          <RequireAuth>
            <PaymentPage />
          </RequireAuth>
        }
      />
      <Route
        path="/booking/gcash"
        element={
          <RequireAuth>
            <GCashPlaceholderPage />
          </RequireAuth>
        }
      />
      <Route
        path="/booking/confirmation"
        element={
          <RequireAuth>
            <ConfirmationPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
