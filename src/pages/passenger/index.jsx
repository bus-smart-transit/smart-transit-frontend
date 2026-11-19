import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { GuestRoute } from '../../api/hooks/contexts/AuthGuard';
import { AuthProvider } from '../../api/hooks/contexts/AuthProvider';

import { SkeletonPage } from '../../components/ui/Skeleton';
const LandingPage = lazy(() => import('../../components/Passenger/LandingPage/LandingPage'));
const SignUpPage = lazy(() => import('../../components/Passenger/SignupPage/SignupPage'));
const LoginPage = lazy(() => import('../../components/Passenger/LoginPage/LoginPage'));
const ForgotPasswordPage = lazy(() => import('../../components/Passenger/Auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../../components/Passenger/Auth/ResetPasswordPage'));
const PassengerDashboard = lazy(() => import('../../components/Passenger/Dashboard/Dashboard'));
const BuyTicketPage = lazy(() => import('../../components/Passenger/BuyTicket/BuyTicketPage'));
const AvailableTripsPage = lazy(() => import('../../components/Passenger/Trips/AvailableTripsPage'));
const AddPhonePage = lazy(() => import('../../components/Passenger/Auth/AddPhonePage'));

function PassengerRouteFallback() {
    return (
        <SkeletonPage label="Loading passenger portal..." />
    );
}

const GUEST_ROUTES = [
    { path: 'signup', element: <SignUpPage /> },
    { path: 'login', element: <LoginPage /> },
    { path: 'forgot-password', element: <ForgotPasswordPage /> },
    { path: 'reset-password', element: <ResetPasswordPage /> }
]

export default function PassengerBaseRouter() {
    return (
        <AuthProvider role="passenger">
            <Suspense fallback={<PassengerRouteFallback />}>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="search" element={<LandingPage />} />
                    <Route path="book" element={<BuyTicketPage />} />
                    <Route path="trips" element={<AvailableTripsPage />} />
                    <Route path="dashboard" element={<PassengerDashboard />} />
                    {/* 2026-11-07: after signing up with Google, add the mobile number. */}
                    <Route path="add-phone" element={<AddPhonePage />} />

                    <Route element={<GuestRoute role="passenger" authenticatedRedirectTo="/" />}>
                        {GUEST_ROUTES.map((route) => (
                            <Route key={route.path} path={route.path} element={route.element} />
                        ))}
                    </Route>
                </Routes>
            </Suspense>
        </AuthProvider>
    );
}