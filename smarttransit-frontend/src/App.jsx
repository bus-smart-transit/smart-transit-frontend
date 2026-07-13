import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/Landing/LandingPage.jsx";
import LoginPage from "./pages/Auth/LoginPage.jsx";
import SignupPage from "./pages/Auth/SignupPage.jsx";
import DashboardPage from "./pages/Dashboard/DashboardPage.jsx";
import TripResultsPage from "./pages/Booking/TripResultsPage.jsx";
import SeatSelectionPage from "./pages/Booking/SeatSelectionPage.jsx";
import PaymentPage from "./pages/Booking/PaymentPage.jsx";
import GCashPlaceholderPage from "./pages/Booking/GCashPlaceholderPage.jsx";
import ConfirmationPage from "./pages/Booking/ConfirmationPage.jsx";
import TrackBusPage from "./pages/TrackBus/TrackBusPage.jsx";
import MyTicketsPage from "./pages/MyTickets/MyTicketsPage.jsx";
import TripHistoryPage from "./pages/TripHistory/TripHistoryPage.jsx";
import RewardsPage from "./pages/Rewards/RewardsPage.jsx";
import ProfilePage from "./pages/Profile/ProfilePage.jsx";

// Main router for the app. Each page lives in its own folder under
// src/pages/ -- see each folder for the components that make it up.
export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Passenger dashboard + sidebar pages */}
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/my-tickets" element={<MyTicketsPage />} />
      <Route path="/trip-history" element={<TripHistoryPage />} />
      <Route path="/track-bus" element={<TrackBusPage />} />
      <Route path="/rewards" element={<RewardsPage />} />

      {/* Booking flow: search -> seats -> payment -> gcash -> confirmation */}
      <Route path="/booking" element={<TripResultsPage />} />
      <Route path="/booking/seats" element={<SeatSelectionPage />} />
      <Route path="/booking/payment" element={<PaymentPage />} />
      <Route path="/booking/gcash" element={<GCashPlaceholderPage />} />
      <Route path="/booking/confirmation" element={<ConfirmationPage />} />

      {/* Profile */}
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  );
}
