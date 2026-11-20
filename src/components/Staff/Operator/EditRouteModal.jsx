import { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import Modal from '../../ui/Modal';
import { moveItem, sortedRouteStops } from '../../../utils/operatorRouteView';

const INPUT = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500';
const PRIMARY = 'inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60';
const SECONDARY = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const ARROW = 'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';

/**
 * 2026-11-20 (user): the Company Admin edits a route: its name, origin and destination, and the order of its stops
 * (Move up / Move down). Saving sends only what changed; a new stop order makes the server draw the route line
 * again. The server refuses a new order while upcoming trips of the route have tickets sold, and says so.
 */
export default function EditRouteModal({ open, route, onClose, onSave }) {
  const [form, setForm] = useState(() => ({ route_name: route.route_name || '', origin: route.origin || '', destination: route.destination || '' }));
  const [stops, setStops] = useState(() => sortedRouteStops(route));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const original = sortedRouteStops(route).map((stop) => stop.id);
  const orderChanged = stops.map((stop) => stop.id).join(',') !== original.join(',');
  const details = Object.fromEntries(Object.entries(form).filter(([key, value]) => value.trim() !== String(route[key] ?? '')));
  const nothingChanged = !orderChanged && Object.keys(details).length === 0;

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({ details, order: orderChanged ? stops.map((stop) => stop.id) : null });
    } catch (err) {
      setError(err?.message || 'The route could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit route" fullScreenOnMobile>
      <form onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-xs font-medium text-slate-600 sm:col-span-3">Route name<input value={form.route_name} onChange={set('route_name')} required className={`${INPUT} mt-1`} /></label>
          <label className="block text-xs font-medium text-slate-600 sm:col-span-3 lg:col-span-1">Origin<input value={form.origin} onChange={set('origin')} required className={`${INPUT} mt-1`} /></label>
          <label className="block text-xs font-medium text-slate-600 sm:col-span-3 lg:col-span-2">Destination<input value={form.destination} onChange={set('destination')} required className={`${INPUT} mt-1`} /></label>
        </div>

        <p className="mt-5 text-sm font-semibold text-slate-900">Stop order</p>
        <p className="text-xs text-slate-500">The bus stops in this order on an outbound trip (a return trip runs it backwards). Saving a new order draws the route line again.</p>
        <ol className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200" data-testid="edit-route-stops">
          {stops.map((stop, index) => (
            <li key={stop.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 text-sm text-slate-900">
                <span className="font-data mr-2 text-xs text-slate-500">{index + 1}</span>
                {stop.stop?.stop_name || stop.stop_name || `Stop #${stop.stop_id}`}
              </span>
              <span className="flex shrink-0 gap-1">
                <button type="button" className={ARROW} aria-label={`Move ${stop.stop?.stop_name || stop.stop_name || 'stop'} up`} disabled={index === 0} onClick={() => setStops((list) => moveItem(list, index, -1))}>
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" className={ARROW} aria-label={`Move ${stop.stop?.stop_name || stop.stop_name || 'stop'} down`} disabled={index === stops.length - 1} onClick={() => setStops((list) => moveItem(list, index, 1))}>
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ol>

        {error && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={SECONDARY}>Cancel</button>
          <button type="submit" disabled={saving || nothingChanged} className={PRIMARY}>{saving ? 'Saving...' : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  );
}
