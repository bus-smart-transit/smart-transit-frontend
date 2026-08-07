import { Navigate, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Base URL for API calls — must match the Vite proxy / backend origin.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

/**
 * Validates a staff token against the backend before allowing a redirect or
 * granting access. Returns 'loading' | 'valid' | 'invalid'.
 */
async function validateStaffToken(token, role) {
  if (!token || !role) return 'invalid';

  // Each role exposes its own profile endpoint; any 2xx means the token is live.
  try {
    const res = await fetch(`${API_BASE}/${role}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok ? 'valid' : 'invalid';
  } catch {
    // Network failure — fail safe: treat as invalid so the user stays on login.
    return 'invalid';
  }
}

/**
 * Bug 1 fix: validate token SERVER-SIDE before redirecting.
 * Previously: read localStorage presence only → stale/expired token from a
 * prior session caused an immediate redirect to a dashboard that returned 403.
 * Now: token is verified via GET /{role}/profile before any redirect fires.
 */
export function StaffGuestRoute() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'guest' | 'redirect'
  const [validRole, setValidRole] = useState('');

  useEffect(() => {
    let cancelled = false;

    const token = localStorage.getItem('staff_token') || sessionStorage.getItem('staff_token');
    const role = localStorage.getItem('staff_role') || sessionStorage.getItem('staff_role');

    validateStaffToken(token, role).then((result) => {
      if (cancelled) return;
      if (result === 'valid') {
        setValidRole(role);
        setStatus('redirect');
      } else {
        // Clear any stale credentials so they don't interfere with a fresh login.
        localStorage.removeItem('staff_token');
        localStorage.removeItem('staff_role');
        sessionStorage.removeItem('staff_token');
        sessionStorage.removeItem('staff_role');
        setStatus('guest');
      }
    });

    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400 text-sm">
        Verifying session...
      </div>
    );
  }

  if (status === 'redirect') {
    return <Navigate to={`/employee/${validRole}/dashboard`} replace />;
  }

  return <Outlet />;
}

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
