import { Routes, Route, Navigate } from 'react-router-dom';
import { StaffGuestRoute, StaffProtectedRoute } from '../../components/StaffAuthGuard';
import StaffLoginPage from '../../components/Staff/StaffLoginPage';
import DriverDashboard from '../../components/Staff/DriverDashboard';
import ConductorDashboard from '../../components/Staff/ConductorDashboard';
import OperatorDashboard from '../../components/Staff/OperatorDashboard';

export default function EmployeeBaseRouter() {
	return (
		<Routes>
			<Route element={<StaffGuestRoute />}>
				<Route path="login" element={<StaffLoginPage />} />
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
	);
}
