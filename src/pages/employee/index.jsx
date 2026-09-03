import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { StaffGuestRoute, StaffProtectedRoute } from '../../components/StaffAuthGuard';

const StaffLoginPage = lazy(() => import('../../components/Staff/StaffLoginPage'));
const StaffForgotPasswordPage = lazy(() => import('../../components/Staff/StaffForgotPasswordPage'));
const StaffResetPasswordPage = lazy(() => import('../../components/Staff/StaffResetPasswordPage'));
const DriverDashboard = lazy(() => import('../../components/Staff/DriverDashboard'));
const ConductorDashboard = lazy(() => import('../../components/Staff/ConductorDashboard'));
const OperatorDashboard = lazy(() => import('../../components/Staff/OperatorDashboard'));

function EmployeeRouteFallback() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-300">
			<div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm">Loading staff portal...</div>
		</div>
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

				<Route path="*" element={<Navigate to="/employee/login" replace />} />
			</Routes>
		</Suspense>
	);
}
