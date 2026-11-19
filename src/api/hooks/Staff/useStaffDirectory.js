import { useCallback, useEffect, useRef, useState } from 'react';
import OperatorService from '../../StaffService/OperatorService';

export const SEARCH_DEBOUNCE_MS = 300;

/** The server's per-field messages of a refused request ({} when there are none). */
export const apiFieldErrors = (err) => err?.cause?.response?.data?.errors ?? {};

/**
 * Batch 46: the Operator's Staff Directory. The server pages, searches (username, email, name, role word) and counts
 * the whole roster; this hook keeps the search (debounced), the role filter and the page, and runs the actions.
 * A new search or role goes back to page 1.
 */
export default function useStaffDirectory() {
  const [search, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRoleState] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', staff: [], pagination: { page: 1, per_page: 10, total: 0, last_page: 1 }, totals: { driver: 0, conductor: 0 }, company: null });
  const [reloadKey, setReloadKey] = useState(0);
  const timer = useRef(null);

  const setSearch = useCallback((value) => {
    setSearchText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setQuery(value.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const setRole = useCallback((value) => {
    setRoleState(value);
    setPage(1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = { page };
    if (query) params.search = query;
    if (role) params.role = role;
    OperatorService.getStaffPage(params)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? {};
        setState({
          loading: false,
          error: '',
          staff: data.staff ?? [],
          pagination: data.pagination ?? { page: 1, per_page: 10, total: 0, last_page: 1 },
          totals: data.totals ?? { driver: 0, conductor: 0 },
          company: data.company ?? null,
        });
      })
      .catch((err) => {
        if (!cancelled) setState((prev) => ({ ...prev, loading: false, error: err?.message || 'Could not load your staff.' }));
      });
    return () => { cancelled = true; };
  }, [query, role, page, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const run = useCallback(async (action) => {
    const res = await action();
    reload();
    return res;
  }, [reload]);

  return {
    ...state,
    search,
    setSearch,
    searching: query !== '',
    role,
    setRole,
    page,
    setPage,
    reload,
    createStaff: (payload) => run(() => OperatorService.createEmployeeAccount(payload)),
    updateStaff: (id, changes) => run(() => OperatorService.updateStaff(id, changes)),
    deactivateStaff: (id) => run(() => OperatorService.deactivateStaff(id)),
    reactivateStaff: (id) => run(() => OperatorService.reactivateStaff(id)),
  };
}
