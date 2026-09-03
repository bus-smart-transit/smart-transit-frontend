import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { GuestRoute } from '../../api/hooks/contexts/AuthGuard';
import { AuthProvider } from '../../api/hooks/contexts/AuthProvider';

const LandingPage = lazy(() => import('../../components/Passenger/LandingPage/LandingPage'));
const SignUpPage = lazy(() => import('../../components/Passenger/SignupPage/SignupPage'));
const LoginPage = lazy(() => import('../../components/Passenger/LoginPage/LoginPage'));
const ForgotPasswordPage = lazy(() => import('../../components/Passenger/Auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../../components/Passenger/Auth/ResetPasswordPage'));
const PassengerDashboard = lazy(() => import('../../components/Passenger/Dashboard/Dashboard'));
const BuyTicketPage = lazy(() => import('../../components/Passenger/BuyTicket/BuyTicketPage'));

function PassengerRouteFallback() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm">Loading passenger portal...</div>
        </div>
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
                    <Route path="dashboard" element={<PassengerDashboard />} />

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