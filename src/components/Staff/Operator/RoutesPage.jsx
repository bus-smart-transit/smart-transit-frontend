import { useMemo, useState } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { OpPageHeader, OpCard, OpChip, OpStat, OpTable } from './OperatorUI';
import { OP_SPACE } from './operatorUiTokens';
import Modal from '../../ui/Modal';
import RouteDetailPage from './RouteDetailPage';
import { useRoutesTab } from '../../../api/hooks/Staff/useOperatorDashboard';
import {
  buildRouteRows, filterRouteRows, municipalityOptions, formatDuration,
} from '../../../utils/operatorRouteView';

const INPUT = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500';
const PRIMARY = 'inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60';
const SECONDARY = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

function Message({ text }) {
  if (!text) return null;
  const failed = text.toLowerCase().includes('failed');
  return <p role={failed ? 'alert' : 'status'} className={`mt-3 rounded-lg border px-3 py-2 text-sm ${failed ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{text}</p>;
}

function AddRouteModal({ open, onClose, form, setForm, saving, message, onSubmit }) {
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  return (
    <Modal open={open} onClose={onClose} title="Add route" fullScreenOnMobile>
      <form onSubmit={onSubmit}>
        <div className="grid gap-4">
          <label className="block text-xs font-medium text-slate-600">Route name<input value={form.route_name} onChange={set('route_name')} required className={`${INPUT} mt-1`} /></label>
          <label className="block text-xs font-medium text-slate-600">Origin<input value={form.origin} onChange={set('origin')} required className={`${INPUT} mt-1`} /></label>
          <label className="block text-xs font-medium text-slate-600">Destination<input value={form.destination} onChange={set('destination')} required className={`${INPUT} mt-1`} /></label>
        </div>
        <Message text={message} />
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={SECONDARY}>Cancel</button>
          <button type="submit" disabled={saving} className={PRIMARY}>{saving ? 'Creating...' : 'Create route'}</button>
        </div>
      </form>
    </Modal>
  );
}

function StopModal({ open, onClose, editing, form, setForm, saving, message, onSubmit }) {
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit stop' : 'Add stop'} fullScreenOnMobile>
      <form onSubmit={onSubmit}>
        <div className="grid gap-4">
          <label className="block text-xs font-medium text-slate-600">Stop name<input value={form.stop_name} onChange={set('stop_name')} required className={`${INPUT} mt-1`} /></label>
          <label className="block text-xs font-medium text-slate-600">Location label<input value={form.location} onChange={set('location')} className={`${INPUT} mt-1`} /></label>
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">Coordinates are worked out from the location label and the stop name.</p>
        </div>
        <Message text={message} />
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={SECONDARY}>Cancel</button>
          <button type="submit" disabled={saving} className={PRIMARY}>{editing ? 'Update stop' : 'Create stop'}</button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Batch 31 Phase 4: the Operator's Routes page. A list of routes (open one to see its detail) and the stops directory.
 * Forms moved into modals with the same fields and handlers; nothing was removed except the "Route Adherence" column,
 * which was really a completion rate and now appears under that name on the route's Overview.
 */
export default function RoutesPage({ routes, stops, trips, fleets, onRefresh, onOpenSchedule, onOpenFleets }) {
  const routesTab = useRoutesTab({ onRefresh });
  const {
    manageMsg, clearManageMsg, manageSaving, editingStopId, setEditingStopId, stopForm, setStopForm,
    routeForm, handleCreateStop, handleDeleteStop, handleCreateRoute, setRouteForm,
  } = routesTab;

  const [query, setQuery] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [modal, setModal] = useState(null); // 'route' | 'stop' | null
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  const rows = useMemo(() => buildRouteRows({ routes, fleets }), [routes, fleets]);
  const shown = filterRouteRows(rows, { query, municipality });
  const municipalities = municipalityOptions(rows);
  const selected = rows.find((row) => row.routeId === selectedRouteId) || null;

  const open = (which) => { clearManageMsg(); setModal(which); };
  const closeModal = () => { setModal(null); if (modal === 'stop') { setEditingStopId(null); setStopForm({ stop_name: '', location: '' }); } };
  const submitRoute = async (event) => { if (await handleCreateRoute(event)) setModal(null); };
  const submitStop = async (event) => { if (await handleCreateStop(event)) setModal(null); };
  const openEditStop = (stop) => { clearManageMsg(); setEditingStopId(stop.stop_id); setStopForm({ stop_name: stop.stop_name || '', location: stop.location || '' }); setModal('stop'); };
  const openAddStop = () => { setEditingStopId(null); setStopForm({ stop_name: '', location: '' }); open('stop'); };

  if (selected) {
    return (
      <RouteDetailPage
        row={selected}
        routes={routes}
        fleets={fleets}
        stops={stops}
        trips={trips}
        routesTab={routesTab}
        onBack={() => setSelectedRouteId(null)}
        onRefresh={onRefresh}
        onOpenSchedule={onOpenSchedule}
        onOpenFleets={onOpenFleets}
      />
    );
  }

  const withFleet = rows.filter((row) => row.status.key === 'active').length;
  const columns = [
    { key: 'route', header: 'Route', render: (row) => (
      <span className="whitespace-nowrap">
        <strong className="text-slate-900">{row.route.route_name}</strong>
        <span className="block text-xs text-slate-500">{row.route.origin || '-'} to {row.route.destination || '-'}</span>
      </span>
    ) },
    { key: 'municipalities', header: 'Municipalities', render: (row) => (row.municipalities.length ? <span className="text-xs">{row.municipalities.join(', ')}</span> : <span className="text-slate-400">-</span>) },
    { key: 'stops', header: 'Stops', render: (row) => row.stopCount },
    { key: 'distance', header: 'Distance', className: 'whitespace-nowrap', render: (row) => (row.distanceKm === null ? '-' : `${row.distanceKm} km`) },
    { key: 'duration', header: 'Travel time', className: 'whitespace-nowrap', render: (row) => formatDuration(row.durationMin) ?? '-' },
    { key: 'fleets', header: 'Active fleets', render: (row) => (row.activeFleets.length ? <span className="text-xs">{row.activeFleets.length}<span className="block text-slate-500">{row.activeFleets.map((item) => item.plate).join(', ')}</span></span> : <span className="text-slate-400">0</span>) },
    { key: 'status', header: 'Status', render: (row) => <span className="inline-flex flex-wrap gap-1"><OpChip tone={row.status.tone}>{row.status.label}</OpChip>{row.geometryIssue && <OpChip tone="warning">Line needs to be redrawn</OpChip>}</span> },
    { key: 'open', header: '', render: (row) => <button type="button" aria-label={`Open route ${row.route.route_name}`} onClick={() => setSelectedRouteId(row.routeId)} className={SECONDARY}>Open</button> },
  ];

  const stopColumns = [
    { key: 'stop', header: 'Stop', render: (stop) => <span className="whitespace-nowrap"><strong className="text-slate-900">{stop.stop_name}</strong>{stop.stop_code && <span className="block text-xs text-slate-500">{stop.stop_code}</span>}</span> },
    { key: 'municipality', header: 'Municipality', render: (stop) => stop.municipality || '-' },
    { key: 'lat', header: 'Latitude', render: (stop) => stop.latitude ?? '-' },
    { key: 'lng', header: 'Longitude', render: (stop) => stop.longitude ?? '-' },
    { key: 'actions', header: '', render: (stop) => (
      <span className="inline-flex gap-2">
        <button type="button" aria-label={`Edit stop ${stop.stop_name}`} onClick={() => openEditStop(stop)} className={SECONDARY}>Edit</button>
        <button type="button" aria-label={`Delete stop ${stop.stop_name}`} disabled={manageSaving} onClick={() => { void handleDeleteStop(stop.stop_id); }} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50">Delete</button>
      </span>
    ) },
  ];

  return (
    <div className={OP_SPACE.stack}>
      <OpPageHeader
        title="Routes"
        subtitle="Where your buses run, the stops on each route and who serves it"
        action={<button type="button" onClick={() => open('route')} className={PRIMARY}><Plus className="h-4 w-4" aria-hidden="true" /> Add route</button>}
      />

      {manageMsg && !modal && (
        <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${manageMsg.toLowerCase().includes('failed') ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{manageMsg}</p>
      )}

      <section aria-label="Route summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <OpStat label="Routes" value={rows.length} />
        <OpStat label="With an active fleet" value={withFleet} tone="success" />
        <OpStat label="No active fleet" value={rows.length - withFleet} tone={rows.length - withFleet ? 'warning' : 'neutral'} />
        <OpStat label="Stops" value={stops.length} hint="in your directory" />
      </section>

      <OpCard
        title="Route list"
        badge={<button type="button" onClick={onRefresh} className={SECONDARY}><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh</button>}
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <label className="relative block">
            <span className="sr-only">Search routes</span>
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, origin or destination" className={`${INPUT} pl-9`} />
          </label>
          <select aria-label="Filter by municipality" value={municipality} onChange={(event) => setMunicipality(event.target.value)} className={INPUT}>
            <option value="">All municipalities</option>
            {municipalities.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <OpTable caption="Routes" columns={columns} rows={shown} rowKey={(row) => row.routeId} empty={rows.length === 0 ? 'No routes yet. Use Add route to create your first one.' : 'No route matches this search.'} />
      </OpCard>

      <OpCard
        title="Stops directory"
        subtitle="Stops you can place on routes."
        badge={<button type="button" onClick={openAddStop} className={PRIMARY}><Plus className="h-4 w-4" aria-hidden="true" /> Add stop</button>}
      >
        <OpTable caption="Stops" columns={stopColumns} rows={stops} rowKey={(stop) => stop.stop_id} empty="No stops yet." />
      </OpCard>

      <AddRouteModal open={modal === 'route'} onClose={closeModal} form={routeForm} setForm={setRouteForm} saving={manageSaving} message={manageMsg} onSubmit={submitRoute} />
      <StopModal open={modal === 'stop'} onClose={closeModal} editing={Boolean(editingStopId)} form={stopForm} setForm={setStopForm} saving={manageSaving} message={manageMsg} onSubmit={submitStop} />
    </div>
  );
}
