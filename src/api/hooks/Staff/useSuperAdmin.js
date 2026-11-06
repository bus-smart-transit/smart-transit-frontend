import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminService from '../../StaffService/AdminService';
import { apiFieldErrors } from './useStaffDirectory';

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

/** The text of a refused request (the server's first field message, else its message). */
export function adminErrorText(error, fallback) {
  const first = Object.values(apiFieldErrors(error)).flat()[0];
  return first || error?.message || fallback;
}

/**
 * Batch 48 Phase 3: the Companies page. Add, rename and add a Company Admin; each change reloads the list.
 */
export function useAdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');
  const [requested, setRequested] = useState(0);
  const [answered, setAnswered] = useState(-1);

  useEffect(() => {
    let active = true;
    AdminService.getCompanies()
      .then((response) => { if (active) { setCompanies(Array.isArray(response?.data) ? response.data : []); setError(''); } })
      .catch(() => { if (active) setError('The companies could not be loaded. Try again.'); })
      .finally(() => { if (active) setAnswered(requested); });
    return () => { active = false; };
  }, [requested]);

  const reload = useCallback(() => setRequested((n) => n + 1), []);
  const after = (call) => async (...args) => { const result = await call(...args); reload(); return result; };

  return {
    companies,
    loading: answered !== requested,
    error,
    reload,
    createCompany: after((name) => AdminService.createCompany(name)),
    renameCompany: after((id, name) => AdminService.renameCompany(id, name)),
    addCompanyAdmin: after((id, payload) => AdminService.addCompanyAdmin(id, payload)),
  };
}

export const ADMIN_SEARCH_DEBOUNCE_MS = 350;

/**
 * Batch 48 Phase 3: the Users page. Search (after a short pause) and a role filter start again from page 1.
 */
export function useAdminUsers() {
  const [search, setSearchText] = useState('');
  const [query, setQuery] = useState({ search: '', role: '', page: 1, version: 0 });
  const [result, setResult] = useState({ users: [], pagination: { page: 1, per_page: 15, total: 0, last_page: 1 } });
  const [error, setError] = useState('');
  const [answered, setAnswered] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => setQuery((prev) => (prev.search === search ? prev : { ...prev, search, page: 1 })), ADMIN_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let active = true;
    const params = { page: query.page };
    if (query.search.trim()) params.search = query.search.trim();
    if (query.role) params.role = query.role;
    AdminService.getUsers(params)
      .then((response) => { if (active && response?.data) { setResult(response.data); setError(''); } })
      .catch(() => { if (active) setError('The accounts could not be loaded. Try again.'); })
      .finally(() => { if (active) setAnswered(query); });
    return () => { active = false; };
  }, [query]);

  const reload = useCallback(() => setQuery((prev) => ({ ...prev, version: prev.version + 1 })), []);
  const after = (call) => async (...args) => { const out = await call(...args); reload(); return out; };

  return {
    ...result,
    loading: answered !== query,
    error,
    search,
    setSearch: setSearchText,
    role: query.role,
    setRole: (role) => setQuery((prev) => ({ ...prev, role, page: 1 })),
    setPage: (page) => setQuery((prev) => ({ ...prev, page })),
    deactivate: after((id) => AdminService.deactivateUser(id)),
    reactivate: after((id) => AdminService.reactivateUser(id)),
    setCompanyAdmin: after((id, on) => AdminService.setCompanyAdmin(id, on)),
  };
}
