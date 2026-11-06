import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminService from '../../StaffService/AdminService';

/**
 * Batch 48 Phase 2: the Super Admin portal's own state. useSuperAdminSession: who is signed in and signing out.
 * useAdminOverview: the Dashboard counts (null while loading; an error message when they could not be loaded).
 */
export function useSuperAdminSession() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let active = true;
    AdminService.getProfile('admin')
      .then((response) => { if (active) setProfile(response?.data ?? null); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const signOut = async () => {
    try { await AdminService.logout('admin'); } catch (error) { void error; }
    navigate('/employee/login');
  };

  return { profile, signOut };
}

export function useAdminOverview() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  // Each Refresh asks for a new load; loading = the latest load has not answered yet.
  const [requested, setRequested] = useState(0);
  const [answered, setAnswered] = useState(-1);

  useEffect(() => {
    let active = true;
    AdminService.getOverview()
      .then((response) => {
        if (!active) return;
        setOverview(response?.data ?? null);
        setError('');
      })
      .catch(() => { if (active) setError('The overview could not be loaded. Try again.'); })
      .finally(() => { if (active) setAnswered(requested); });
    return () => { active = false; };
  }, [requested]);

  const reload = useCallback(() => setRequested((n) => n + 1), []);

  return { overview, loading: answered !== requested, error, reload };
}
