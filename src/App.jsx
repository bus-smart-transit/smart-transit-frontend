import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DefaultLayout from './layouts/default';
import PassengerBaseRouter from './pages/passenger';
import EmployeeBaseRouter from './pages/employee';
import LandingPage from './components/Passenger/LandingPage/LandingPage';
import CheckoutReturn from './components/Passenger/CheckoutReturn/CheckoutReturn';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DefaultLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>

        <Route path="/passenger/*" element={<PassengerBaseRouter />} />
        <Route path="/checkout/success" element={<CheckoutReturn />} />
        <Route path="/checkout/cancel" element={<CheckoutReturn />} />
        <Route path="/employee/*" element={<EmployeeBaseRouter />} />
        <Route path="/staff/*" element={<Navigate to="/employee/login" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}