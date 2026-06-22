import { Navigate, Outlet } from "react-router-dom";
import { usePublicLayout } from "../api/hooks/usePublicLayout"; // Adjust path to your hook location

/**
 * Blocks unauthenticated users from reaching protected dashboard pages.
 */
export function ProtectedRoute() {
    const { isAuthenticated, isLoading } = usePublicLayout();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-200">
                <p className="animate-pulse">Loading secure session...</p>
            </div>
        );
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/passenger/login" replace />;
}

/**
 * Prevents authenticated users from accessing login/signup forms again.
 */
export function GuestRoute() {
    const { isAuthenticated, isLoading } = usePublicLayout();

    if (isLoading) return null; // Or a minimal spinner layout

    return !isAuthenticated ? <Outlet /> : <Navigate to="/passenger/dashboard" replace />;
}