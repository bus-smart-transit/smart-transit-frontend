import { Navigate, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { TokenManager } from '../utils/TokenManager.js';
import StaffService from '../api/StaffService/StaffBaseService';

/**
 * Validates a staff token against the backend before allowing a redirect or
 * granting access. Returns 'invalid' | 'valid'.
 *
 * Architecture audit follow-up (CONF-06): previously called `fetch()`
 * directly, bypassing BaseService's auth-header/error handling. Now goes
 * through StaffService.getProfile(), which reads the same stored token.
 */
async function validateStaffToken(token, role) {
  if (!token || !role) return 'invalid';

  try {
    await StaffService.getProfile(role);
    return 'valid';
  } catch (err) {
    const status = err?.cause?.response?.status ?? err?.response?.status ?? null;

    // Network failure (e.g. CORS, offline) has no HTTP status — treat as
    // valid so we don't wipe a freshly-issued token just because the
    // tunnel/backend is unreachable. Any real HTTP error status means the
    // token itself was rejected.
    return status === null ? 'valid' : 'invalid';
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
