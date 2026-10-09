import { useCallback, useEffect, useState } from 'react';
import OperatorService from '../../StaffService/OperatorService';

/**
 * State for the Operator's Refunds tab: online payments the system took money for but could not turn into tickets
 * (`needs_refund`), and the record that the Operator refunded them. The server decides every figure and every status;
 * this hook sends the filter, the page and the note the Operator types. "Loading" is derived (the result in hand is for
 * another request) so no effect sets state synchronously.
 */
export default function usePaymentRefunds({ service = OperatorService } = {}) {
  const [status, setStatusState] = useState('needs_refund');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: '' });
  const [busyId, setBusyId] = useState(null);
  const [errors, setErrors] = useState({});

  const key = JSON.stringify({ status, page, reload });

  useEffect(() => {
    let cancelled = false;
    const params = JSON.parse(key);
    service.getUnfulfilledPayments({ status: params.status, page: params.page })
      .then((res) => { if (!cancelled) setResult({ key, data: res?.data ?? null, error: '' }); })
      .catch((err) => { if (!cancelled) setResult({ key, data: null, error: err?.message || 'The payments could not be loaded.' }); });
    return () => { cancelled = true; };
  }, [key, service]);

  const setStatus = useCallback((next) => { setStatusState(next); setPage(1); }, []);
  const retry = useCallback(() => setReload((n) => n + 1), []);

  const recordRefund = useCallback(async (id, { note }) => {
    setBusyId(id);
    setErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      await service.recordPaymentRefund(id, { note });
      setReload((n) => n + 1);
    } catch (err) {
      setErrors((prev) => ({ ...prev, [id]: err?.message || 'The refund could not be recorded.' }));
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
    retry, recordRefund, busyId, errors,
  };
}
