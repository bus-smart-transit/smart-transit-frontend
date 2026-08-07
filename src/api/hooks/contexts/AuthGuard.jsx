import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../useAuth";

export function ProtectedRoute({ role = "passenger" }) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-200">
                <p className="animate-pulse">Loading secure session...</p>
            </div>
        );
    }

    return isAuthenticated ? <Outlet /> : <Navigate to={`/${role}/login`} replace />;
}

export function GuestRoute({ role = "passenger" }) {
    const { isAuthenticated, isLoading } = useAuth(role);

    if (isLoading) return null;

    return !isAuthenticated ? <Outlet /> : <Navigate to={`/${role}/dashboard`} replace />;
}