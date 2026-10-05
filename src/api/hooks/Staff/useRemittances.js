import { useCallback, useEffect, useState } from 'react';
import OperatorService from '../../StaffService/OperatorService';

/**
 * Batch 29, cash step 3: state for the Operator's Remittances tab. The server decides every figure; this hook sends the
 * status filter and page, and the counted amount when the Operator confirms. "Loading" is derived (the result in hand is
 * for another request) so no effect sets state synchronously.
 */
export default function useRemittances({ service = OperatorService } = {}) {
  const [status, setStatusState] = useState('pending');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: '' });
  const [busyId, setBusyId] = useState(null);
  const [errors, setErrors] = useState({});

  const key = JSON.stringify({ status, page, reload });

  useEffect(() => {
    let cancelled = false;
    const params = JSON.parse(key);
    service.getRemittances({ status: params.status, page: params.page })
      .then((res) => { if (!cancelled) setResult({ key, data: res?.data ?? null, error: '' }); })
      .catch((err) => { if (!cancelled) setResult({ key, data: null, error: err?.message || 'The remittances could not be loaded.' }); });
    return () => { cancelled = true; };
  }, [key, service]);

  const setStatus = useCallback((next) => { setStatusState(next); setPage(1); }, []);
  const retry = useCallback(() => setReload((n) => n + 1), []);

  const confirm = useCallback(async (id, { countedAmount, note }) => {
    setBusyId(id);
    setErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      await service.confirmRemittance(id, { counted_amount: countedAmount, note: note || undefined });
      setReload((n) => n + 1);
    } catch (err) {
      setErrors((prev) => ({ ...prev, [id]: err?.message || 'The remittance could not be confirmed.' }));
    } finally {
      setBusyId(null);
    }
  }, [service]);

  const current = result.key === key;
  return {
    status, setStatus, page, setPage,
    rows: current ? (result.data?.data ?? []) : [],
    meta: current ? (result.data?.meta ?? null) : null,
    error: current ? result.error : '',
    loading: !current,
    hasData: current && Boolean(result.data),
    retry, confirm, busyId, errors,
  };
}
