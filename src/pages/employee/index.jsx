import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { StaffGuestRoute, StaffProtectedRoute } from '../../components/StaffAuthGuard';

import { SkeletonPage } from '../../components/ui/Skeleton';
const StaffLoginPage = lazy(() => import('../../components/Staff/StaffLoginPage'));
const StaffForgotPasswordPage = lazy(() => import('../../components/Staff/StaffForgotPasswordPage'));
const StaffResetPasswordPage = lazy(() => import('../../components/Staff/StaffResetPasswordPage'));
const DriverDashboard = lazy(() => import('../../components/Staff/DriverDashboard'));
const ConductorDashboard = lazy(() => import('../../components/Staff/ConductorDashboard'));
const OperatorDashboard = lazy(() => import('../../components/Staff/OperatorDashboard'));
const SuperAdminPortal = lazy(() => import('../../components/Staff/Admin/SuperAdminPortal'));

function EmployeeRouteFallback() {
	return (
		<SkeletonPage variant="portal" label="Loading staff portal..." />
	);
}

export default function EmployeeBaseRouter() {
	return (
		<Suspense fallback={<EmployeeRouteFallback />}>
			<Routes>
				<Route element={<StaffGuestRoute />}>
					<Route path="login" element={<StaffLoginPage />} />
					<Route path="forgot-password" element={<StaffForgotPasswordPage />} />
					<Route path="reset-password" element={<StaffResetPasswordPage />} />
				</Route>

				<Route element={<StaffProtectedRoute allowedRoles={["driver"]} />}>
					<Route path="driver/dashboard" element={<DriverDashboard />} />
				</Route>

				<Route element={<StaffProtectedRoute allowedRoles={["conductor"]} />}>
					<Route path="conductor/dashboard" element={<ConductorDashboard />} />
				</Route>

				<Route element={<StaffProtectedRoute allowedRoles={["operator"]} />}>
					<Route path="operator/dashboard" element={<OperatorDashboard />} />
				</Route>

				<Route element={<StaffProtectedRoute allowedRoles={["admin"]} />}>
					{/* Batch 48: the Super Admin portal (Phase 7 removed the earlier panel). */}
					<Route path="admin/dashboard" element={<SuperAdminPortal />} />
				</Route>

				<Route path="*" element={<Navigate to="/employee/login" replace />} />
			</Routes>
		</Suspense>
	);
}
