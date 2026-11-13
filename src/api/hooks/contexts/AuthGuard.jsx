import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../useAuth";
import { SkeletonPage } from '../../../components/ui/Skeleton';
import { pageVariantForPath } from '../../../utils/skeletonVariant';

export function ProtectedRoute({ role = "passenger" }) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <SkeletonPage variant={pageVariantForPath()} label="Loading secure session..." />
        );
    }

    return isAuthenticated ? <Outlet /> : <Navigate to={`/${role}/login`} replace />;
}

export function GuestRoute({ role = "passenger", authenticatedRedirectTo = null }) {
    const { isAuthenticated, isLoading } = useAuth(role);

    if (isLoading) return null;

    const redirectPath = authenticatedRedirectTo ?? `/${role}/dashboard`;

    return !isAuthenticated ? <Outlet /> : <Navigate to={redirectPath} replace />;
}