import { useCallback, useEffect, useMemo, useState } from 'react';
import { DROPOFF_MODES, DROPOFF_MODE_LABELS, pointKindLabel } from '../../utils/dropoffRestrictions';

const TONES = {
  light: { card: 'rounded-2xl border border-slate-200 bg-white p-4', title: 'text-slate-900', muted: 'text-slate-500', head: 'text-slate-500', row: 'border-t border-slate-100 text-slate-700', input: 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500', btn: 'rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60', ghost: 'rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200', rule: 'border-slate-200' },
  dark: { card: 'rounded-2xl border border-slate-700 bg-[#101a30] p-4', title: 'text-white', muted: 'text-slate-400', head: 'text-slate-400', row: 'border-t border-slate-700/70 text-slate-200', input: 'rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500', btn: 'rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60', ghost: 'rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-600', rule: 'border-slate-700' },
};

const KINDS = ['barangay', 'intersection', 'landmark'];
const EMPTY_POINT = { name: '', kind: 'landmark', municipality: '', latitude: '', longitude: '', source: '', note: '' };
const EMPTY_AREA = { name: '', from_stop_id: '', to_stop_id: '', source: '', note: '' };

/**
 * Batch 28 Stage 3, item 10: the staff screen for custom drop-off. Per route: the mode (off, listed points only, pin
 * anywhere), the restricted areas (a stretch between two stops where custom drop-off is not available) and the
 * designated alighting points. Everything is typed in by staff (the operator's fare matrix is the source for the
 * points); the server measures where each point and area sits on the route line, and refuses a point that is not on it.
 * An area flagged "needs review" is shown with its reason; while it is, custom drop-off is paused on that route.
 */
export default function DropoffRulesPanel({ service, routes = [], tone = 'light', onRoutesChanged }) {
  const t = TONES[tone] || TONES.light;
  const [routeId, setRouteId] = useState('');
  const [points, setPoints] = useState([]);
  const [areas, setAreas] = useState([]);
  const [stops, setStops] = useState([]);
  const [modes, setModes] = useState({});
  const [pointForm, setPointForm] = useState(EMPTY_POINT);
  const [areaForm, setAreaForm] = useState(EMPTY_AREA);
  const [editingPoint, setEditingPoint] = useState(null);
  const [editingArea, setEditingArea] = useState(null);
  const [municipality, setMunicipality] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selected = routeId || (routes[0] ? String(routes[0].route_id) : '');
  const route = useMemo(() => routes.find((r) => String(r.route_id) === String(selected)), [routes, selected]);
  const mode = modes[selected] ?? route?.custom_dropoff_mode ?? (route?.allow_custom_dropoff ? 'free_pin' : 'off');

  const load = useCallback(async () => {
    if (!selected) return;
    try {
      const [pointRes, areaRes, stopRes] = await Promise.all([
        service.getDropoffPoints({ route_id: selected }),
        service.getDropoffRestrictions(selected),
        service.getRouteStopsForDropoff(selected),
      ]);
      setPoints(Array.isArray(pointRes?.data) ? pointRes.data : []);
      setAreas(Array.isArray(areaRes?.data) ? areaRes.data : []);
      setStops(Array.isArray(stopRes?.data) ? stopRes.data : []);
      setError('');
    } catch (err) {
      setError(err?.message || 'The drop-off rules could not be loaded.');
    }
  }, [service, selected]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const run = async (label, call, after) => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await call();
      setMessage(label);
      if (after) after();
      await load();
    } catch (err) {
      const first = err?.fieldErrors ? Object.values(err.fieldErrors)[0]?.[0] : null;
      setError(first || err?.message || 'Nothing was changed.');
    } finally {
      setSaving(false);
    }
  };

  const changeMode = (next) => run('Drop-off mode updated.', async () => {
    await service.setRouteDropoffMode(Number(selected), next);
    setModes((prev) => ({ ...prev, [selected]: next }));
    onRoutesChanged?.();
  });

  const savePoint = (event) => {
    event.preventDefault();
    const payload = { ...pointForm, route_id: Number(selected), latitude: Number(pointForm.latitude), longitude: Number(pointForm.longitude) };
    return run(editingPoint ? 'Drop-off point updated.' : 'Drop-off point saved.', () => service.saveDropoffPoint(payload, editingPoint), () => { setPointForm(EMPTY_POINT); setEditingPoint(null); });
  };

  const editPoint = (point) => {
    setEditingPoint(point.id);
    setPointForm({ name: point.name, kind: point.kind, municipality: point.municipality || '', latitude: String(point.latitude), longitude: String(point.longitude), source: point.source || '', note: point.note || '' });
  };

  const togglePoint = (point) => run(point.is_active ? 'Drop-off point switched off.' : 'Drop-off point switched on.', () => service.saveDropoffPoint({
    route_id: point.route_id, name: point.name, kind: point.kind, municipality: point.municipality || undefined, latitude: point.latitude, longitude: point.longitude,
    source: point.source || undefined, note: point.note || undefined, is_active: !point.is_active,
  }, point.id));

  const saveArea = (event) => {
    event.preventDefault();
    const payload = { ...areaForm, route_id: Number(selected), from_stop_id: Number(areaForm.from_stop_id), to_stop_id: Number(areaForm.to_stop_id) };
    return run(editingArea ? 'Restricted area updated.' : 'Restricted area saved.', () => service.saveDropoffRestriction(payload, editingArea), () => { setAreaForm(EMPTY_AREA); setEditingArea(null); });
  };

  const editArea = (area) => {
    setEditingArea(area.id);
    setAreaForm({ name: area.name, from_stop_id: String(area.from_stop_id ?? ''), to_stop_id: String(area.to_stop_id ?? ''), source: area.source || '', note: area.note || '' });
  };

  const toggleArea = (area) => run(area.is_active ? 'Restricted area switched off.' : 'Restricted area switched on.', () => service.saveDropoffRestriction({ route_id: area.route_id, is_active: !area.is_active }, area.id));
  const confirmArea = (area) => run('Restricted area confirmed.', () => service.reviewDropoffRestriction(area.id));

  const shownPoints = municipality.trim() ? points.filter((p) => (p.municipality || '').toLowerCase().includes(municipality.trim().toLowerCase())) : points;
  const set = (setter) => (field) => (event) => setter((prev) => ({ ...prev, [field]: event.target.value }));
  const setP = set(setPointForm);
  const setA = set(setAreaForm);

  return (
    <section className={`${t.card} space-y-5`} data-testid="dropoff-rules-panel">
      <div>
        <h3 className={`text-sm font-semibold uppercase tracking-[0.14em] ${t.title}`}>Custom drop-off: points and restricted areas</h3>
        <p className={`mt-1 text-xs ${t.muted}`}>
          Official stops are always available. This controls where passengers may get off between them: nowhere (off), only at the listed points, or at a pin anywhere on the route. A restricted area is a stretch between two stops where custom drop-off is never offered, in both directions.
        </p>
      </div>

      {message && <p role="status" className="text-sm text-emerald-600">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        <label className={`text-xs ${t.muted}`}>Route
          <select aria-label="Route" value={selected} onChange={(e) => { setRouteId(e.target.value); setEditingPoint(null); setEditingArea(null); }} className={`${t.input} mt-1 w-full`}>
            {routes.map((r) => <option key={r.route_id} value={r.route_id}>{r.route_name}</option>)}
          </select>
        </label>
        <label className={`text-xs ${t.muted}`}>Custom drop-off mode
          <select aria-label="Custom drop-off mode" value={mode} onChange={(e) => changeMode(e.target.value)} disabled={saving || !selected} className={`${t.input} mt-1 w-full`}>
            {DROPOFF_MODES.map((m) => <option key={m} value={m}>{DROPOFF_MODE_LABELS[m]}</option>)}
          </select>
        </label>
      </div>

      {/* Restricted areas */}
      <div className={`space-y-3 border-t pt-4 ${t.rule}`}>
        <h4 className={`text-xs font-semibold uppercase tracking-wide ${t.title}`}>Restricted areas</h4>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-xs" data-testid="restriction-table">
            <thead className={t.head}><tr>{['Name', 'From stop', 'To stop', 'Source', 'Status', ''].map((h) => <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {areas.length === 0 ? (
                <tr><td colSpan={6} className={`px-2 py-4 text-center ${t.muted}`}>No restricted area on this route.</td></tr>
              ) : areas.map((area) => (
                <tr key={area.id} className={t.row} data-testid="restriction-row">
                  <td className="px-2 py-1.5 font-medium">{area.name}</td>
                  <td className="px-2 py-1.5">{area.from_stop_name || '-'}</td>
                  <td className="px-2 py-1.5">{area.to_stop_name || '-'}</td>
                  <td className="px-2 py-1.5">{area.source || ''}{area.pending_confirmation && <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-800">Pending confirmation</span>}</td>
                  <td className="px-2 py-1.5">
                    {area.needs_review ? (
                      <span data-testid="needs-review" className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800" title={area.review_reason || ''}>Needs review: custom drop-off is paused on this route. {area.review_reason}</span>
                    ) : area.is_active ? 'Active' : 'Off'}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex flex-wrap gap-1">
                      {area.needs_review && <button type="button" className={t.ghost} disabled={saving} onClick={() => confirmArea(area)}>Confirm area</button>}
                      <button type="button" className={t.ghost} disabled={saving} onClick={() => editArea(area)}>Edit</button>
                      <button type="button" className={t.ghost} disabled={saving} onClick={() => toggleArea(area)}>{area.is_active ? 'Switch off' : 'Switch on'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form onSubmit={saveArea} className="grid gap-3 md:grid-cols-4" aria-label="Restricted area">
          <input aria-label="Area name" value={areaForm.name} onChange={setA('name')} required maxLength={120} placeholder="Area name" className={t.input} />
          <select aria-label="From stop" value={areaForm.from_stop_id} onChange={setA('from_stop_id')} required className={t.input}>
            <option value="">From stop</option>
            {stops.map((s) => <option key={`from-${s.stop_id}`} value={s.stop_id}>{s.stop_order}. {s.stop_name}</option>)}
          </select>
          <select aria-label="To stop" value={areaForm.to_stop_id} onChange={setA('to_stop_id')} required className={t.input}>
            <option value="">To stop</option>
            {stops.map((s) => <option key={`to-${s.stop_id}`} value={s.stop_id}>{s.stop_order}. {s.stop_name}</option>)}
          </select>
          <input aria-label="Area source" value={areaForm.source} onChange={setA('source')} maxLength={120} placeholder="Source (who decided it)" className={t.input} />
          <input aria-label="Area note" value={areaForm.note} onChange={setA('note')} placeholder="Note (optional)" className={`${t.input} md:col-span-3`} />
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !selected} className={t.btn}>{editingArea ? 'Update area' : 'Save area'}</button>
            {editingArea && <button type="button" className={t.ghost} onClick={() => { setEditingArea(null); setAreaForm(EMPTY_AREA); }}>Cancel</button>}
          </div>
        </form>
      </div>

      {/* Designated points */}
      <div className={`space-y-3 border-t pt-4 ${t.rule}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className={`text-xs font-semibold uppercase tracking-wide ${t.title}`}>Designated drop-off points</h4>
          <input aria-label="Filter by municipality" value={municipality} onChange={(e) => setMunicipality(e.target.value)} placeholder="Filter by municipality" className={`${t.input} w-56`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-xs" data-testid="point-table">
            <thead className={t.head}><tr>{['Name', 'Kind', 'Municipality', 'Along route (m)', 'Source', 'Status', ''].map((h) => <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {shownPoints.length === 0 ? (
                <tr><td colSpan={7} className={`px-2 py-4 text-center ${t.muted}`}>No designated points on this route.</td></tr>
              ) : shownPoints.map((point) => (
                <tr key={point.id} className={t.row} data-testid="point-row">
                  <td className="px-2 py-1.5 font-medium">{point.name}{point.is_sample && <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[0.65rem] font-semibold text-slate-700">SAMPLE</span>}</td>
                  <td className="px-2 py-1.5">{pointKindLabel(point.kind)}</td>
                  <td className="px-2 py-1.5">{point.municipality || ''}</td>
                  <td className="px-2 py-1.5">{point.distance_along_outbound_m ?? '-'}</td>
                  <td className="px-2 py-1.5">{point.source || ''}</td>
                  <td className="px-2 py-1.5">{point.is_active ? 'Active' : 'Off'}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1">
                      <button type="button" className={t.ghost} disabled={saving} onClick={() => editPoint(point)}>Edit</button>
                      <button type="button" className={t.ghost} disabled={saving} onClick={() => togglePoint(point)}>{point.is_active ? 'Switch off' : 'Switch on'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form onSubmit={savePoint} className="grid gap-3 md:grid-cols-4" aria-label="Drop-off point">
          <input aria-label="Point name" value={pointForm.name} onChange={setP('name')} required maxLength={120} placeholder="Name (from the fare matrix)" className={t.input} />
          <select aria-label="Point kind" value={pointForm.kind} onChange={setP('kind')} className={t.input}>
            {KINDS.map((k) => <option key={k} value={k}>{pointKindLabel(k)}</option>)}
          </select>
          <input aria-label="Municipality" value={pointForm.municipality} onChange={setP('municipality')} placeholder="Municipality" className={t.input} />
          <input aria-label="Point source" value={pointForm.source} onChange={setP('source')} maxLength={120} placeholder="Source" className={t.input} />
          <input aria-label="Latitude" type="number" step="any" value={pointForm.latitude} onChange={setP('latitude')} required placeholder="Latitude" className={t.input} />
          <input aria-label="Longitude" type="number" step="any" value={pointForm.longitude} onChange={setP('longitude')} required placeholder="Longitude" className={t.input} />
          <input aria-label="Point note" value={pointForm.note} onChange={setP('note')} placeholder="Note (optional)" className={`${t.input} md:col-span-1`} />
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !selected} className={t.btn}>{editingPoint ? 'Update point' : 'Save point'}</button>
            {editingPoint && <button type="button" className={t.ghost} onClick={() => { setEditingPoint(null); setPointForm(EMPTY_POINT); }}>Cancel</button>}
          </div>
        </form>
        <p className={`text-xs ${t.muted}`}>The server places each point on the route line and works out its distance along the route in both directions. A point that is not on the route line, or outside the service region, is refused.</p>
      </div>
    </section>
  );
}
