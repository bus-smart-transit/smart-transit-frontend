import { Routes, Route } from 'react-router-dom';
import { GuestRoute } from '../../api/hooks/contexts/AuthGuard';
import { AuthProvider } from '../../api/hooks/contexts/AuthProvider';

import LandingPage from '../../components/Passenger/LandingPage/LandingPage';
import SignUpPage from '../../components/Passenger/SignupPage/SignupPage';
import LoginPage from '../../components/Passenger/LoginPage/LoginPage';
import PassengerDashboard from '../../components/Passenger/Dashboard/Dashboard';

const GUEST_ROUTES = [
    { path: 'signup', element: <SignUpPage /> },
    { path: 'login', element: <LoginPage /> },
    { path: 'landingpage', element: <LandingPage /> }
]

export default function PassengerBaseRouter() {
    return (
        <AuthProvider role="passenger">
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="dashboard" element={<PassengerDashboard />} />

                <Route element={<GuestRoute role="passenger" />}>
                    {GUEST_ROUTES.map((route) => (
                        <Route key={route.path} path={route.path} element={route.element} />
                    ))}
                </Route>
            </Routes>
        </AuthProvider>
    );
}