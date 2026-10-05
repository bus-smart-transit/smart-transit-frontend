import { useCallback, useEffect, useState } from 'react';
import {
  EMPTY_WINDOW, buildWindowPayload, dayTypeLabel, directionLabel, windowFormFromReportRow,
} from '../../utils/durationFactors';

const TONES = {
  light: { card: 'rounded-2xl border border-slate-200 bg-white p-4', title: 'text-slate-900', muted: 'text-slate-500', head: 'text-slate-500', row: 'border-t border-slate-100 text-slate-700', input: 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500', btn: 'rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60', ghost: 'rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200' },
  dark: { card: 'rounded-2xl border border-slate-700 bg-[#101a30] p-4', title: 'text-white', muted: 'text-slate-400', head: 'text-slate-400', row: 'border-t border-slate-700/70 text-slate-200', input: 'rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500', btn: 'rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60', ghost: 'rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-600' },
};

/**
 * Batch 28 Stage 3, item 7: manage the peak-hour windows of a route (a window scales the route's stop offsets for a leg
 * whose scheduled departure falls inside it; no window = x1.0) and read the duration report. The factors are
 * "configured": entered by your team, never measured by the system, and the report only proposes numbers.
 */
export default function DurationFactorsPanel({ service, routes = [], tone = 'light' }) {
  const t = TONES[tone] || TONES.light;
  const [windows, setWindows] = useState([]);
  const [form, setForm] = useState(EMPTY_WINDOW);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await service.getDurationFactors();
      setWindows(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err?.message || 'The windows could not be loaded.');
    }
  }, [service]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await service.saveDurationFactor(buildWindowPayload(form), editingId);
      setMessage(editingId ? 'Window updated.' : 'Window saved.');
      setForm({ ...EMPTY_WINDOW, route_id: form.route_id });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err?.message || 'The window could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (window) => {
    setEditingId(window.id);
    setForm({ route_id: String(window.route_id), direction: window.direction || '', day_type: window.day_type || '', start_time: window.start_time, end_time: window.end_time, factor: String(window.factor), note: window.note || '', source: window.source });
  };

  const remove = async (window) => {
    setError('');
    try {
      await service.deleteDurationFactor(window.id);
      setMessage('Window removed.');
      await load();
    } catch (err) {
      setError(err?.message || 'The window could not be removed.');
    }
  };

  const loadReport = async () => {
    setError('');
    try {
      const res = await service.getDurationReport();
      setReport(res?.data ?? null);
    } catch (err) {
      setError(err?.message || 'The report could not be loaded.');
    }
  };

  const applyProposal = (row) => {
    const next = windowFormFromReportRow(row);
    if (next) {
      setEditingId(null);
      setForm(next);
      setMessage('The proposal is in the form below. Check it and press Save if you agree; nothing is applied until then.');
    }
  };

  return (
    <section className={`${t.card} space-y-4`} data-testid="duration-factors-panel">
      <div>
        <h3 className={`text-sm font-semibold uppercase tracking-[0.14em] ${t.title}`}>Peak-hour duration factors</h3>
        <p className={`mt-1 text-xs ${t.muted}`}>
          A window multiplies a route&apos;s stop offsets for a leg whose scheduled departure falls inside it. With no matching window the factor is 1.0. These factors are configured by your team; the system does not measure them.
        </p>
      </div>

      {message && <p role="status" className="text-sm text-emerald-600">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-xs" data-testid="duration-factors-table">
          <thead className={t.head}>
            <tr>{['Route', 'Direction', 'Days', 'From', 'To', 'Factor', 'Kind', 'Note', ''].map((h) => <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {windows.length === 0 ? (
              <tr><td colSpan={9} className={`px-2 py-4 text-center ${t.muted}`}>No windows yet: every leg runs at factor 1.0.</td></tr>
            ) : windows.map((window) => (
              <tr key={window.id} className={t.row} data-testid="duration-window-row">
                <td className="px-2 py-1.5">{window.route_name}</td>
                <td className="px-2 py-1.5">{directionLabel(window.direction)}</td>
                <td className="px-2 py-1.5">{dayTypeLabel(window.day_type)}</td>
                <td className="px-2 py-1.5">{window.start_time}</td>
                <td className="px-2 py-1.5">{window.end_time}</td>
                <td className="px-2 py-1.5 font-semibold">x{Number(window.factor)}</td>
                <td className="px-2 py-1.5">{window.label}</td>
                <td className={`px-2 py-1.5 ${t.muted}`}>{window.note || ''}</td>
                <td className="px-2 py-1.5">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => edit(window)} className={t.ghost}>Edit</button>
                    <button type="button" onClick={() => remove(window)} className={t.ghost}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={save} className="grid gap-3 md:grid-cols-4" aria-label="Duration window">
        <select aria-label="Route" value={form.route_id} onChange={set('route_id')} required disabled={editingId !== null} className={t.input}>
          <option value="">Route</option>
          {routes.map((route) => <option key={route.route_id} value={route.route_id}>{route.route_name}</option>)}
        </select>
        <select aria-label="Direction" value={form.direction} onChange={set('direction')} className={t.input}>
          <option value="">Both directions</option><option value="outbound">Outbound</option><option value="reverse">Reverse</option>
        </select>
        <select aria-label="Days" value={form.day_type} onChange={set('day_type')} className={t.input}>
          <option value="">Every day</option><option value="weekday">Weekdays</option><option value="weekend">Weekends</option>
        </select>
        <input aria-label="Factor" type="number" min="0.1" step="0.05" value={form.factor} onChange={set('factor')} required placeholder="Factor, e.g. 1.5" className={t.input} />
        <label className={`text-xs ${t.muted}`}>From<input type="time" value={form.start_time} onChange={set('start_time')} required className={`${t.input} mt-1 w-full`} /></label>
        <label className={`text-xs ${t.muted}`}>To<input type="time" value={form.end_time} onChange={set('end_time')} required className={`${t.input} mt-1 w-full`} /></label>
        <input aria-label="Note" value={form.note} maxLength={255} onChange={set('note')} placeholder="Note (optional)" className={`${t.input} md:col-span-2`} />
        <div className="md:col-span-4 flex gap-2">
          <button type="submit" disabled={saving} className={t.btn}>{saving ? 'Saving...' : editingId ? 'Update window' : 'Save window'}</button>
          {editingId !== null && <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_WINDOW); }} className={t.ghost}>Cancel edit</button>}
        </div>
      </form>

      <div className="border-t border-slate-200/20 pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs ${t.muted}`}>Read-only report: the median actual leg duration per route, direction and hour, from completed legs (Depart to End Trip).</p>
          <button type="button" onClick={loadReport} className={t.ghost}>{report ? 'Refresh report' : 'Show report'}</button>
        </div>
        {report && (
          <div className="mt-2 overflow-x-auto" data-testid="duration-report">
            <table className="w-full min-w-[40rem] text-left text-xs">
              <thead className={t.head}>
                <tr>{['Route', 'Direction', 'Service', 'Hour', 'Legs', 'Median min', 'Ordinary min', 'Proposal', ''].map((h) => <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {report.rows.length === 0 ? (
                  <tr><td colSpan={9} className={`px-2 py-3 text-center ${t.muted}`}>No completed legs recorded yet.</td></tr>
                ) : report.rows.map((row) => (
                  <tr key={`${row.route_id}-${row.direction}-${row.service_type}-${row.hour}`} className={t.row} data-testid="duration-report-row">
                    <td className="px-2 py-1.5">{row.route_name}</td>
                    <td className="px-2 py-1.5">{directionLabel(row.direction)}</td>
                    <td className="px-2 py-1.5">{row.service_type}</td>
                    <td className="px-2 py-1.5">{String(row.hour).padStart(2, '0')}:00</td>
                    <td className="px-2 py-1.5">{row.samples}</td>
                    <td className="px-2 py-1.5">{row.median_minutes}</td>
                    <td className="px-2 py-1.5">{row.base_minutes ?? '-'}</td>
                    <td className="px-2 py-1.5">{row.enough_data ? `x${row.proposed_factor}` : row.note}</td>
                    <td className="px-2 py-1.5">{row.enough_data && <button type="button" onClick={() => applyProposal(row)} className={t.ghost}>Use as a window</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
