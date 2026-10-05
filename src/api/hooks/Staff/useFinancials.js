import { useCallback, useEffect, useState } from 'react';
import OperatorService from '../../StaffService/OperatorService';
import { getBusinessToday } from '../../../utils/dates';
import { csvFileName, filtersToParams, presetRange, saveCsv } from '../../../utils/financials';

const BLANK = { route_id: '', fleet_id: '', trip_id: '', payment_method: '', channel: '' };

/**
 * Batch 29, Stage 2: state for the Operator's financial page. The server does every calculation; this hook only
 * sends the filters, keeps the sort and page of the log, and downloads the CSV the server builds from the same query.
 * "Loading" is derived (the result in hand is for another request), so no effect sets state synchronously.
 */
export default function useFinancials({ service = OperatorService } = {}) {
  const today = getBusinessToday();
  const [filters, setFilters] = useState({ from: today, to: today, ...BLANK });
  const [table, setTable] = useState({ page: 1, sort: 'paid_at', dir: 'desc' });
  const [reload, setReload] = useState(0);
  const [summaryResult, setSummaryResult] = useState({ key: null, data: null, error: '' });
  const [logResult, setLogResult] = useState({ key: null, data: null, error: '' });
  const [exporting, setExporting] = useState('');
  const [exportError, setExportError] = useState('');

  const summaryKey = JSON.stringify({ params: filtersToParams(filters), reload });
  const logKey = JSON.stringify({ params: filtersToParams(filters, table), reload });

  useEffect(() => {
    let cancelled = false;
    const { params } = JSON.parse(summaryKey);
    service.getFinancials(params)
      .then((res) => { if (!cancelled) setSummaryResult({ key: summaryKey, data: res?.data ?? null, error: '' }); })
      .catch((err) => { if (!cancelled) setSummaryResult({ key: summaryKey, data: null, error: err?.message || 'The figures could not be loaded.' }); });
    return () => { cancelled = true; };
  }, [summaryKey, service]);

  useEffect(() => {
    let cancelled = false;
    const { params } = JSON.parse(logKey);
    service.getFinancialTransactions(params)
      .then((res) => { if (!cancelled) setLogResult({ key: logKey, data: res?.data ?? null, error: '' }); })
      .catch((err) => { if (!cancelled) setLogResult({ key: logKey, data: null, error: err?.message || 'The transactions could not be loaded.' }); });
    return () => { cancelled = true; };
  }, [logKey, service]);

  const updateFilters = useCallback((patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setTable((prev) => ({ ...prev, page: 1 }));
  }, []);

  const applyPreset = useCallback((key) => updateFilters(presetRange(key, getBusinessToday())), [updateFilters]);

  const resetFilters = useCallback(() => updateFilters({ ...presetRange('today', getBusinessToday()), ...BLANK }), [updateFilters]);

  const sortBy = useCallback((column) => {
    setTable((prev) => ({ page: 1, sort: column, dir: prev.sort === column && prev.dir === 'desc' ? 'asc' : 'desc' }));
  }, []);

  const goToPage = useCallback((page) => setTable((prev) => ({ ...prev, page })), []);

  const retry = useCallback(() => setReload((n) => n + 1), []);

  const exportCsv = useCallback(async (type) => {
    setExporting(type);
    setExportError('');
    try {
      const text = await service.downloadFinancialExport(filtersToParams(filters, { ...table, type }));
      saveCsv(typeof text === 'string' ? text : '', csvFileName(type, filters));
    } catch (err) {
      setExportError(err?.message || 'The export could not be created.');
    } finally {
      setExporting('');
    }
  }, [filters, table, service]);

  return {
    filters, updateFilters, applyPreset, resetFilters,
    table, sortBy, goToPage,
    summary: summaryResult.key === summaryKey ? summaryResult.data : null,
    summaryError: summaryResult.key === summaryKey ? summaryResult.error : '',
    summaryLoading: summaryResult.key !== summaryKey,
    log: logResult.key === logKey ? logResult.data : null,
    logError: logResult.key === logKey ? logResult.error : '',
    logLoading: logResult.key !== logKey,
    retry, exportCsv, exporting, exportError,
  };
}
