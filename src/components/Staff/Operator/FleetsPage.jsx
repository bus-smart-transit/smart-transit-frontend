import { useMemo, useState } from 'react';
import { RefreshCw, Bus, ChevronRight, MapPinned, Pencil, Plus } from 'lucide-react';
import { OpPageHeader, OpCard, OpChip, OpStat, OpEmpty } from './OperatorUI';
import { OP_SPACE } from './operatorUiTokens';
import Modal from '../../ui/Modal';
import FilterTabs from '../../ui/FilterTabs';
import FareRulesPanel from '../FareRulesPanel';
import { useCanManageCompany } from './companyAdmin';
import FleetTrackingMap from './FleetTrackingMap';
import RerouteAdviceItem from './RerouteAdviceItem';
import OperatorService from '../../../api/StaffService/OperatorService';
import useFareOptions from '../../../api/hooks/Staff/useFareOptions';
import { useFleetsTab } from '../../../api/hooks/Staff/useOperatorDashboard';
import { useDispatchAdvice, useNow } from '../../../api/hooks/Staff/useOperatorDashboardExtras';
import { buildFleetRows, filterFleetRows, FLEET_FILTERS } from '../../../utils/operatorFleetView';
import {
  buildDashboardView, decisionPayload, routeNameOf, departureLabel, ticketsSold, capacityOf, loadPct,
} from '../../../utils/operatorDashboardView';

const INPUT = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500';
const PRIMARY = 'inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60';
const SECONDARY = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

const GPS_TONE = { live: 'success', stale: 'warning', weak: 'warning', off_route: 'warning', none: 'neutral' };
const personName = (person) => person?.user?.name || person?.name || person?.user?.username || person?.username || null;

function Label({ text, hint, children, className = '' }) {
  return (
    <label className={`block text-xs font-medium text-slate-600 ${className}`}>
      {text}
      <span className="mt-1 block">{children}</span>
      {hint && <span className="mt-1 block font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

function FormMessage({ message }) {
  if (!message) return null;
  const failed = message.toLowerCase().includes('failed');
  return <p role={failed ? 'alert' : 'status'} className={`mt-3 rounded-lg border px-3 py-2 text-sm ${failed ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{message}</p>;
}

function AddFleetModal({ open, onClose, form, setForm, routes, fareOptions, saving, message, onSubmit, companyName = null }) {
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  return (
    <Modal open={open} onClose={onClose} title="Add fleet" fullScreenOnMobile>
      <form onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Plate number"><input value={form.plate_number} onChange={set('plate_number')} required className={INPUT} /></Label>
          <Label text="Fleet type">
            <select value={form.fleet_type} onChange={set('fleet_type')} className={INPUT}>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </Label>
          {/* Batch 46 step 2: the bus belongs to the Operator's company; its name is the label's first part (set by the Admin). */}
          <div className="text-xs font-semibold text-slate-700">
            Bus company name
            <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900" data-testid="fleet-company-name">{companyName || 'Not provided'}</p>
            <span className="mt-1 block font-normal text-slate-500">Your company. Shown to passengers.</span>
          </div>
          <Label text="Body number" hint="Shown to passengers"><input value={form.body_no} onChange={set('body_no')} maxLength={30} className={INPUT} /></Label>
          <Label text="Vehicle class" className="sm:col-span-2">
            <select aria-label="Vehicle class" value={form.vehicle_class} onChange={set('vehicle_class')} className={INPUT}>
              <option value="">Vehicle class: not specified</option>
              {fareOptions.vehicle_classes.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
            </select>
          </Label>
          <Label text="Seated capacity"><input type="number" min="0" value={form.seated_capacity} onChange={set('seated_capacity')} required className={INPUT} /></Label>
          <Label text="Standing capacity"><input type="number" min="0" value={form.standing_capacity} onChange={set('standing_capacity')} required className={INPUT} /></Label>
          <Label text="Route (optional)" className="sm:col-span-2">
            <select value={form.route_id} onChange={set('route_id')} className={INPUT}>
              <option value="">No route yet</option>
              {routes.map((route) => <option key={route.route_id} value={route.route_id}>{route.route_name}</option>)}
            </select>
          </Label>
          {form.route_id && (
            <>
              <Label text="Operating start"><input type="time" value={form.start_time} onChange={set('start_time')} required className={INPUT} /></Label>
              <Label text="Operating end"><input type="time" value={form.end_time} onChange={set('end_time')} required className={INPUT} /></Label>
            </>
          )}
        </div>
        <FormMessage message={message} />
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={SECONDARY}>Cancel</button>
          <button type="submit" disabled={saving} className={PRIMARY}>{saving ? 'Creating...' : 'Create fleet'}</button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * 2026-11-06: edit a bus. The company name stays the company's; places may not drop below what is already sold on a
 * trip that has not finished (the server says how many).
 */
function EditFleetModal({ fleet, fareOptions, companyName, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    plate_number: fleet.plate_number ?? '',
    body_no: fleet.body_no ?? '',
    fleet_type: fleet.fleet_type || 'public',
    vehicle_class: fleet.vehicle_class ?? '',
    seated_capacity: fleet.seated_capacity ?? 0,
    standing_capacity: fleet.standing_capacity ?? 0,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const result = await onSave({
      plate_number: form.plate_number.trim(),
      body_no: form.body_no.trim(),
      fleet_type: form.fleet_type,
      vehicle_class: form.vehicle_class || null,
      seated_capacity: Number(form.seated_capacity),
      standing_capacity: Number(form.standing_capacity),
    });
    setSaving(false);
    if (result.ok) onClose();
    else setError(result.message);
  };

  return (
    <Modal open onClose={onClose} title={`Edit fleet ${fleet.plate_number}`} fullScreenOnMobile>
      <form onSubmit={submit} aria-label="Edit fleet">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Plate number"><input value={form.plate_number} onChange={set('plate_number')} required className={INPUT} /></Label>
          <Label text="Body number" hint="Shown to passengers"><input value={form.body_no} onChange={set('body_no')} maxLength={30} className={INPUT} /></Label>
          <div className="text-xs font-semibold text-slate-700">
            Bus company name
            <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900">{fleet.bus_company_name || companyName || 'Not provided'}</p>
          </div>
          <Label text="Fleet type">
            <select value={form.fleet_type} onChange={set('fleet_type')} className={INPUT}>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </Label>
          <Label text="Vehicle class">
            <select aria-label="Vehicle class" value={form.vehicle_class} onChange={set('vehicle_class')} className={INPUT}>
              <option value="">Not specified</option>
              {fareOptions.vehicle_classes.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
            </select>
          </Label>
          <Label text="Seated capacity"><input type="number" min="0" value={form.seated_capacity} onChange={set('seated_capacity')} required className={INPUT} /></Label>
          <Label text="Standing capacity"><input type="number" min="0" value={form.standing_capacity} onChange={set('standing_capacity')} required className={INPUT} /></Label>
        </div>
        {error && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={SECONDARY}>Cancel</button>
          <button type="submit" disabled={saving} className={PRIMARY}>{saving ? 'Saving...' : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  );
}

function AssignRouteModal({ open, onClose, form, setForm, fleets, routes, saving, message, onSubmit }) {
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  return (
    <Modal open={open} onClose={onClose} title="Assign route to fleet" fullScreenOnMobile>
      <form onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Fleet">
            <select value={form.fleet_id} onChange={set('fleet_id')} required className={INPUT}>
              <option value="">Select fleet</option>
              {fleets.map((fleet) => <option key={fleet.fleet_id} value={fleet.fleet_id}>{fleet.plate_number}</option>)}
            </select>
          </Label>
          <Label text="Route">
            <select value={form.route_id} onChange={set('route_id')} required className={INPUT}>
              <option value="">Select route</option>
              {routes.map((route) => <option key={route.route_id} value={route.route_id}>{route.route_name}</option>)}
            </select>
          </Label>
          <Label text="Operating start"><input type="time" value={form.start_time} onChange={set('start_time')} required className={INPUT} /></Label>
          <Label text="Operating end"><input type="time" value={form.end_time} onChange={set('end_time')} required className={INPUT} /></Label>
        </div>
        <FormMessage message={message} />
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={SECONDARY}>Cancel</button>
          <button type="submit" disabled={saving} className={PRIMARY}>{saving ? 'Assigning...' : 'Assign route'}</button>
        </div>
      </form>
    </Modal>
  );
}

function TrackFleetModal({ row, advice, saving, error, onDecide, onClose, onOpenGoogleMaps }) {
  const trip = row?.liveTrip;
  const pct = trip ? loadPct(trip) : null;
  const tripAdvice = trip ? advice.find((item) => item.route === routeNameOf(trip)) : null;
  return (
    <Modal open={Boolean(row)} onClose={onClose} title={row ? `Track fleet - ${row.fleet.plate_number}` : 'Track fleet'} size="xl" fullScreenOnMobile>
      {row && trip && (
        <div className={OP_SPACE.stack}>
          <div className={OP_SPACE.inline}>
            <OpChip tone={row.status.tone}>{row.status.label}</OpChip>
            <OpChip tone={GPS_TONE[row.gps.state]}>{row.gps.label}</OpChip>
            {/* Batch 49 item 4: the Super Admin's GPS simulator has control of this bus. */}
            {row.location?.is_simulated && <OpChip tone="warning">Simulated</OpChip>}
            {row.lastSeen && row.gps.state === 'live' && <span className="text-xs text-slate-500">Last update {row.lastSeen}</span>}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <FleetTrackingMap trip={trip} location={row.location} />
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-slate-500">Route</dt><dd className="font-semibold text-slate-900">{routeNameOf(trip)}</dd></div>
            <div><dt className="text-xs text-slate-500">Scheduled departure</dt><dd className="font-semibold text-slate-900">{departureLabel(trip)}</dd></div>
            <div><dt className="text-xs text-slate-500">Driver</dt><dd className="font-semibold text-slate-900">{personName(trip.driver) ?? 'Not assigned'}</dd></div>
            <div><dt className="text-xs text-slate-500">Chauffeur</dt><dd className="font-semibold text-slate-900">{personName(trip.conductor) ?? 'Not assigned'}</dd></div>
            <div><dt className="text-xs text-slate-500">Tickets sold</dt><dd className="font-semibold text-slate-900">{ticketsSold(trip)} of {capacityOf(trip) || '-'}{pct === null ? '' : ` (${pct}%)`}</dd></div>
            {/* §4.7: passengers on board now (scanned on or sold on the bus, not yet off), from the server. */}
            <div><dt className="text-xs text-slate-500">On board now</dt><dd data-testid="onboard-now" className="font-semibold text-slate-900">{trip.onboard_count == null ? 'Not provided' : `${trip.onboard_count} of ${capacityOf(trip) || '-'}`}</dd></div>
            <div><dt className="text-xs text-slate-500">Trip status</dt><dd className="font-semibold capitalize text-slate-900">{String(trip.status).replace('-', ' ')}</dd></div>
          </dl>
          <section aria-label="Reroute advice">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Reroute advice</h3>
            {tripAdvice ? (
              <ul><RerouteAdviceItem item={tripAdvice} saving={saving} onDecide={onDecide} /></ul>
            ) : <OpEmpty>No reroute advice for this route right now.</OpEmpty>}
            {error && <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}
            <p className="mt-2 text-xs text-slate-500">The system recommends. The operator decides. Nothing is rerouted automatically.</p>
          </section>
          <div className="flex justify-end">
            <button type="button" disabled={!row.location} onClick={onOpenGoogleMaps} className={SECONDARY}>Open in Google Maps</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/**
 * Batch 31 Phase 3: the Operator's Fleets page. One row per bus; its status is derived from today's trips and its last
 * GPS report (utils/operatorFleetView.js). There is no maintenance state and no progress bar: neither exists in the data.
 */
export default function FleetsPage({ fleets, routes, trips, onRefresh, companyName = null }) {
  const nowMs = useNow();
  const fareOptions = useFareOptions();
  const {
    manageMsg, clearManageMsg, manageSaving, fleetForm, setFleetForm, assignForm, setAssignForm,
    fleetLocations, refreshFleetLocations, handleCreateFleet, handleAssignRoute, openFleetMap, handleUpdateFleet,
  } = useFleetsTab({ onRefresh });
  const { savingTripId, error, decide } = useDispatchAdvice({ onSaved: onRefresh });

  const [filter, setFilter] = useState('all');
  // Batch 53 item 7 (user's design): search by plate or body number; a card per bus, details on demand.
  const [query, setQuery] = useState('');
  const [openDetails, setOpenDetails] = useState(null);
  const [modal, setModal] = useState(null); // 'add' | 'assign' | null
  const [trackedFleetId, setTrackedFleetId] = useState(null);
  const [editingFleet, setEditingFleet] = useState(null);
  const canManage = useCanManageCompany();
  const [notice, setNotice] = useState('');

  const rows = useMemo(() => buildFleetRows({ fleets, trips, locations: fleetLocations, nowMs }), [fleets, trips, fleetLocations, nowMs]);
  const needle = query.trim().toLowerCase();
  const shown = filterFleetRows(rows, filter).filter((row) => !needle || [row.fleet.plate_number, row.fleet.body_no, row.fleet.bus_company_name].some((v) => String(v || '').toLowerCase().includes(needle)));
  const counts = (key) => rows.filter((row) => row.status.key === key).length;
  const dashboard = useMemo(() => buildDashboardView({ trips, fleets, locations: fleetLocations, nowMs }), [trips, fleets, fleetLocations, nowMs]);
  const tracked = rows.find((row) => row.fleetId === trackedFleetId) || null;
  const classLabel = (key) => fareOptions.vehicle_classes.find((entry) => entry.key === key)?.label;

  const closeModal = () => setModal(null);
  const submitFleet = async (event) => { if (await handleCreateFleet(event)) { setModal(null); setNotice('Fleet created successfully.'); } };
  const submitAssign = async (event) => { if (await handleAssignRoute(event)) { setModal(null); setNotice('Route assigned to fleet successfully.'); } };
  const open = (which) => { setNotice(''); clearManageMsg(); setModal(which); };


  return (
    <div className={OP_SPACE.stack}>
      <OpPageHeader
        title="Fleets"
        subtitle="Your buses, their status today and where they are"
        action={canManage ? <button type="button" onClick={() => open('add')} className={PRIMARY}><Plus className="h-4 w-4" aria-hidden="true" /> Add fleet</button> : null}
      />

      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}

      <section aria-label="Fleet summary" className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <OpStat icon={Bus} label="Fleets" value={rows.length} />
        <OpStat label="On route" value={counts('on_route')} tone="success" hint="trip live, GPS fresh" />
        <OpStat label="Active" value={counts('active')} tone="info" hint="trip still to run today" />
        <OpStat label="Idle" value={counts('idle')} hint="no trip left today" />
        <OpStat label="Offline" value={counts('offline')} tone={counts('offline') ? 'warning' : 'neutral'} hint="trip live, no fresh GPS" />
      </section>

      <OpCard
        title="Fleet list"
        subtitle="Status is worked out from today's trips and the bus's last GPS report."
        badge={(
          <div className={OP_SPACE.inline}>
            {canManage && <button type="button" onClick={() => open('assign')} className={SECONDARY}>Assign route</button>}
            <button type="button" onClick={() => { onRefresh(); void refreshFleetLocations(); }} className={SECONDARY}><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh</button>
          </div>
        )}
      >
        <label className="mb-3 block">
          <span className="sr-only">Search fleets</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plate or body number..." className={`${INPUT} rounded-full px-4`} data-testid="fleet-search" />
        </label>
        <FilterTabs options={FLEET_FILTERS.map((option) => ({ ...option, label: `${option.label} (${option.value === 'all' ? rows.length : counts(option.value)})` }))} value={filter} onChange={setFilter} className="mb-2" />
        {shown.length === 0 ? (
          <OpEmpty>{rows.length === 0 ? 'No fleets yet. Use Add fleet to register your first bus.' : 'No fleet matches right now.'}</OpEmpty>
        ) : (
          <ul className="divide-y divide-slate-200" aria-label="Fleets">
            {shown.map((row) => {
              const expanded = openDetails === row.fleetId;
              return (
                <li key={row.fleetId} className="py-4" data-testid="fleet-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-slate-900">{row.fleet.plate_number}</p>
                      <p className="text-xs text-slate-500">{[row.fleet.body_no, row.fleet.bus_company_name].filter(Boolean).join(' · ') || 'No body number'}</p>
                    </div>
                    <OpChip tone={row.status.tone}>{row.status.label}</OpChip>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3">
                    <div><dt className="text-xs text-slate-500">Capacity</dt><dd className="font-semibold text-slate-900">{row.fleet.capacity ?? '-'} passengers</dd></div>
                    <div><dt className="text-xs text-slate-500">Current route</dt><dd className="font-semibold text-slate-900">{row.routes.length ? row.routes.join(', ') : 'No route'}</dd></div>
                  </dl>
                  {expanded && (
                    <dl className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm" data-testid="fleet-details">
                      <div><dt className="text-xs text-slate-500">Type</dt><dd className="text-slate-900">{row.fleet.fleet_type || 'public'} · {classLabel(row.fleet.vehicle_class) || 'Bus type not set'}</dd></div>
                      <div><dt className="text-xs text-slate-500">Seats</dt><dd className="text-slate-900">{row.fleet.seated_capacity ?? 0} seated, {row.fleet.standing_capacity ?? 0} standing</dd></div>
                      <div><dt className="text-xs text-slate-500">Current or next trip</dt><dd className="text-slate-900">{row.nextTripLabel ?? 'No trip left today'}</dd></div>
                      <div><dt className="text-xs text-slate-500">GPS</dt><dd className="text-slate-900">{row.liveTrip ? (row.gps.state === 'live' ? 'Live' : row.gps.state === 'none' ? 'No GPS' : row.gps.state === 'stale' ? 'Out of date' : row.gps.state === 'weak' ? 'Weak signal' : 'Off route') : (row.lastSeen ? `Last seen ${row.lastSeen}` : '-')}{row.liveTrip && row.lastSeen ? ` · ${row.lastSeen}` : ''}</dd></div>
                    </dl>
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={!row.trackable}
                      title={row.trackable ? undefined : 'Tracking is available while a trip is boarding or on the road'}
                      aria-label={`Track fleet ${row.fleet.plate_number}`}
                      onClick={() => setTrackedFleetId(row.fleetId)}
                      className={SECONDARY}
                    >
                      <MapPinned className="h-3.5 w-3.5" aria-hidden="true" /> Track
                    </button>
                    {canManage && <button type="button" aria-label={`Edit fleet ${row.fleet.plate_number}`} onClick={() => { setNotice(''); setEditingFleet(row.fleet); }} className={SECONDARY}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                    </button>}
                    <button type="button" aria-expanded={expanded} onClick={() => setOpenDetails(expanded ? null : row.fleetId)} className="inline-flex min-h-9 items-center gap-1 px-2 text-sm font-semibold text-slate-700 hover:text-slate-900">
                      {expanded ? 'Hide details' : 'View details'} <ChevronRight className={`h-4 w-4 transition ${expanded ? 'rotate-90' : ''}`} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </OpCard>

      <OpCard>
        <FareRulesPanel service={OperatorService} fleets={fleets} routes={routes} canCreateGeneral={false} tone="light" readOnly={!canManage} />
      </OpCard>

      <AddFleetModal companyName={companyName} open={modal === 'add'} onClose={closeModal} form={fleetForm} setForm={setFleetForm} routes={routes} fareOptions={fareOptions} saving={manageSaving} message={manageMsg} onSubmit={submitFleet} />
      {editingFleet && (
        <EditFleetModal
          fleet={editingFleet}
          fareOptions={fareOptions}
          companyName={companyName}
          onClose={() => setEditingFleet(null)}
          onSave={async (changes) => {
            const result = await handleUpdateFleet(editingFleet.fleet_id, changes);
            if (result.ok) setNotice(`Fleet ${changes.plate_number || editingFleet.plate_number} updated.`);
            return result;
          }}
        />
      )}
      <AssignRouteModal open={modal === 'assign'} onClose={closeModal} form={assignForm} setForm={setAssignForm} fleets={fleets} routes={routes} saving={manageSaving} message={manageMsg} onSubmit={submitAssign} />
      <TrackFleetModal
        row={tracked}
        advice={dashboard.advice}
        saving={savingTripId}
        error={error}
        onDecide={(item, decision, note) => decide(item.tripId, decision, decisionPayload(item, decision, note))}
        onClose={() => setTrackedFleetId(null)}
        onOpenGoogleMaps={() => openFleetMap(trackedFleetId)}
      />
    </div>
  );
}
