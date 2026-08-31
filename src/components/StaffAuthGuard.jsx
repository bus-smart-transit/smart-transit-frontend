import { Navigate, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { TokenManager } from '../utils/TokenManager.js';

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
    // Network failure (e.g. CORS, offline) — treat as valid so we don't wipe
    // a freshly-issued token just because the tunnel/backend is unreachable.
    return 'valid';
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

    const token = TokenManager.getStaffToken();
    const role = TokenManager.getStaffRole();

    validateStaffToken(token, role).then((result) => {
      if (cancelled) return;
      if (result === 'valid') {
        setValidRole(role);
        setStatus('redirect');
      } else {
        TokenManager.clearStaffSession();
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
  const [isAuth, setIsAuth] = useState(() => {
    const token = TokenManager.getStaffToken();
    const role  = TokenManager.getStaffRole();
    if (!token) return false;
    if (allowedRoles && !allowedRoles.includes(role)) return false;
    return true;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const token = TokenManager.getStaffToken();
      const role  = TokenManager.getStaffRole();
      const authorized = token && (!allowedRoles || allowedRoles.includes(role));
      setIsAuth(!!authorized);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [allowedRoles]);

  return isAuth ? <Outlet /> : <Navigate to="/employee/login" replace />;
}
