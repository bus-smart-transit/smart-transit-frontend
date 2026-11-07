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

/**
 * Batch 48 Phase 4: the Audit log page. The action text waits for a short pause; any filter goes back to page 1.
 */
export function useAdminAuditLog() {
  const [actionText, setActionText] = useState('');
  const [query, setQuery] = useState({ action: '', role: '', from: '', to: '', page: 1 });
  const [result, setResult] = useState({ entries: [], pagination: { page: 1, per_page: 25, total: 0, last_page: 1 } });
  const [error, setError] = useState('');
  const [answered, setAnswered] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => setQuery((prev) => (prev.action === actionText ? prev : { ...prev, action: actionText, page: 1 })), ADMIN_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [actionText]);

  useEffect(() => {
    let active = true;
    const params = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== '' && value !== null));
    AdminService.getAuditLog(params)
      .then((response) => { if (active && response?.data) { setResult(response.data); setError(''); } })
      .catch((err) => { if (active) setError(adminErrorText(err, 'The audit log could not be loaded. Try again.')); })
      .finally(() => { if (active) setAnswered(query); });
    return () => { active = false; };
  }, [query]);

  const setFilter = (key) => (value) => setQuery((prev) => ({ ...prev, [key]: value, page: 1 }));

  return {
    ...result,
    loading: answered !== query,
    error,
    actionText,
    setActionText,
    role: query.role,
    setRole: setFilter('role'),
    from: query.from,
    setFrom: setFilter('from'),
    to: query.to,
    setTo: setFilter('to'),
    setPage: (page) => setQuery((prev) => ({ ...prev, page })),
  };
}

/**
 * Batch 48 Phase 5: the Payments page. The money report for a date range (this month first) and the payments to
 * refund by hand, across every company. Read only.
 */
export function useAdminPayments(today) {
  const [range, setRange] = useState(() => ({ from: `${today.slice(0, 8)}01`, to: today }));
  const [report, setReport] = useState(null);
  const [refunds, setRefunds] = useState({ data: [], meta: { page: 1, total: 0, last_page: 1, per_page: 20 } });
  const [refundPage, setRefundPage] = useState(1);
  const [error, setError] = useState('');
  const [answered, setAnswered] = useState(null);

  useEffect(() => {
    let active = true;
    AdminService.getFinancials(range)
      .then((response) => { if (active) { setReport(response?.data ?? null); setError(''); } })
      .catch((err) => { if (active) setError(adminErrorText(err, 'The payments could not be loaded. Try again.')); })
      .finally(() => { if (active) setAnswered(range); });
    return () => { active = false; };
  }, [range]);

  useEffect(() => {
    let active = true;
    AdminService.getNeedsRefund({ status: 'needs_refund', page: refundPage })
      .then((response) => { if (active && response?.data) setRefunds(response.data); })
      .catch(() => {});
    return () => { active = false; };
  }, [refundPage]);

  return {
    range,
    setRange: (next) => setRange((prev) => ({ ...prev, ...next })),
    report,
    loading: answered !== range,
    error,
    refunds,
    setRefundPage,
  };
}

/** Batch 48 Phase 6: the System health page (read only); Refresh asks again. */
export function useAdminHealth() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [requested, setRequested] = useState(0);
  const [answered, setAnswered] = useState(-1);

  useEffect(() => {
    let active = true;
    AdminService.getHealth()
      .then((response) => { if (active) { setHealth(response?.data ?? null); setError(''); } })
      .catch((err) => { if (active) setError(adminErrorText(err, 'System health could not be loaded. Try again.')); })
      .finally(() => { if (active) setAnswered(requested); });
    return () => { active = false; };
  }, [requested]);

  const reload = useCallback(() => setRequested((n) => n + 1), []);

  return { health, loading: answered !== requested, error, reload };
}

// Batch 49 item 4: how often the GPS simulator screen refreshes while a simulation is running (the bus moves every few
// seconds on the server).
export const GPS_SIMULATOR_REFRESH_MS = 4000;

/**
 * Batch 49 item 4: the GPS simulator screen. Loads the switch, the simulations and the departed trips; refreshes on
 * its own while a simulation is running; every action reloads the list. The server checks everything.
 */
export function useAdminGpsSimulator() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [requested, setRequested] = useState(0);
  const [answered, setAnswered] = useState(-1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    AdminService.getGpsSimulations()
      .then((response) => { if (active) { setData(response?.data ?? null); setError(''); } })
      .catch((err) => { if (active) setError(adminErrorText(err, 'The GPS simulator could not be loaded. Try again.')); })
      .finally(() => { if (active) setAnswered(requested); });
    return () => { active = false; };
  }, [requested]);

  const reload = useCallback(() => setRequested((n) => n + 1), []);
  const running = Boolean(data?.simulations?.some((sim) => sim.status === 'running'));

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(reload, GPS_SIMULATOR_REFRESH_MS);
    return () => clearInterval(timer);
  }, [running, reload]);

  const act = useCallback(async (call, fallback) => {
    setBusy(true);
    try {
      await call();
      setError('');
      return true;
    } catch (err) {
      setError(adminErrorText(err, fallback));
      return false;
    } finally {
      setBusy(false);
      reload();
    }
  }, [reload]);

  const start = useCallback((tripId, speed) => act(() => AdminService.startGpsSimulation(tripId, speed), 'The simulation could not start. Try again.'), [act]);
  const control = useCallback((simulationId, body) => act(() => AdminService.controlGpsSimulation(simulationId, body), 'That did not work. Try again.'), [act]);

  return { data, loading: answered !== requested, error, busy, reload, start, control };
}
