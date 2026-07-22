import { Navigate, Outlet } from 'react-router-dom';
import { useState } from 'react';

export function StaffProtectedRoute({ allowedRoles }) {
  const [isAuth] = useState(() => {
    const token = localStorage.getItem('staff_token') || sessionStorage.getItem('staff_token');
    const role = localStorage.getItem('staff_role') || sessionStorage.getItem('staff_role');
    if (!token) return false;
    if (allowedRoles && !allowedRoles.includes(role)) return false;
    return true;
  });

  return isAuth ? <Outlet /> : <Navigate to="/employee/login" replace />;
}

export function StaffGuestRoute() {
  const [isAuth] = useState(() => {
    return !!(localStorage.getItem('staff_token') || sessionStorage.getItem('staff_token'));
  });

  if (isAuth) {
    const role = localStorage.getItem('staff_role') || sessionStorage.getItem('staff_role');
    return <Navigate to={`/employee/${role}/dashboard`} replace />;
  }

  return <Outlet />;
}
