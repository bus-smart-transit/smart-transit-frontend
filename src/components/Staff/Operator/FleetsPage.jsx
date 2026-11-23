import { passengerCountLine } from '../../../utils/passengerCount';
import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Bus, ChevronRight, MapPinned, Pencil, Plus, Clock, Pause } from 'lucide-react';
import { OpPageHeader, OpCard, OpChip, OpStat, OpEmpty } from './OperatorUI';
import { OP_SPACE } from './operatorUiTokens';
import Modal from '../../ui/Modal';
import FilterTabs from '../../ui/FilterTabs';
import ViewTabs from '../../ui/ViewTabs';
import FareRulesPanel from '../FareRulesPanel';
import { useCanManageCompany } from './companyAdmin';
import FleetTrackingMap from './FleetTrackingMap';
import RerouteAdviceItem from './RerouteAdviceItem';
import { operatingHoursText } from '../../../utils/busPicker';
import OperatorService from '../../../api/StaffService/OperatorService';
import useFareOptions from '../../../api/hooks/Staff/useFareOptions';
import { useFleetsTab } from '../../../api/hooks/Staff/useOperatorDashboard';
import { useDispatchAdvice, useNow } from '../../../api/hooks/Staff/useOperatorDashboardExtras';
import { buildFleetRows, filterFleetRows, FLEET_FILTERS } from '../../../utils/operatorFleetView';
import {
  buildDashboardView, decisionPayload, routeNameOf, departureLabel, ticketsSold, capacityOf, loadPct, LIVE_STATUSES, fleetIdOf,
} from '../../../utils/operatorDashboardView';

const INPUT = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500';
const PRIMARY = 'inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60';
const SECONDARY = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

const GPS_TONE = { live: 'success', stale: 'warning', weak: 'warning', off_route: 'warning', none: 'neutral' };
const personName = (person) => person?.user?.name || person?.name || person?.user?.username || person?.username || null;

function Label({ text, hint, children, className = '', required = false }) {
  return (
    <label className={`block text-xs font-medium text-slate-600 ${className}`}>
      {text}
      {required && <span className="ml-0.5 text-rose-600" aria-hidden="true">*</span>}
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

function AddFleetModal({ open, onClose, form, setForm, fareOptions, saving, message, onSubmit, companyName = null }) {
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  return (
    <Modal open={open} onClose={onClose} title="Add fleet" fullScreenOnMobile>
      <form onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Plate number" required><input value={form.plate_number} onChange={set('plate_number')} required className={INPUT} /></Label>
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
          <Label text="Body number" required hint="Shown to passengers"><input value={form.body_no} onChange={set('body_no')} maxLength={30} required className={INPUT} /></Label>
          <Label text="Vehicle class" required className="sm:col-span-2">
            <select aria-label="Vehicle class" value={form.vehicle_class} onChange={set('vehicle_class')} required className={INPUT}>
              <option value="">Choose a vehicle class</option>
              {fareOptions.vehicle_classes.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
            </select>
          </Label>
          <Label text="Seats" required hint="At least 20. Standing passengers are not allowed."><input type="number" min="20" max="100" value={form.seated_capacity} onChange={set('seated_capacity')} required className={INPUT} /></Label>
          {/* 2026-11-21 (user, Dynamic Route Scheduling): the bus has its hours; its route is chosen for each trip. */}
          <Label text="Operating start" required hint="Trips can leave from this time"><input type="time" value={form.operating_start_time} onChange={set('operating_start_time')} required className={INPUT} /></Label>
          <Label text="Operating end" required hint="Until this time (it may be after midnight)"><input type="time" value={form.operating_end_time} onChange={set('operating_end_time')} required className={INPUT} /></Label>
          <p className="text-xs text-slate-500 sm:col-span-2">You choose the route each time you schedule a trip for this bus.</p>
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
    operating_start_time: String(fleet.operating_start_time ?? '').slice(0, 5),
    operating_end_time: String(fleet.operating_end_time ?? '').slice(0, 5),
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
      // 2026-11-23 (advisor): operating hours are required; standing passengers are not allowed.
      operating_start_time: form.operating_start_time,
      operating_end_time: form.operating_end_time,
    });
    setSaving(false);
    if (result.ok) onClose();
    else setError(result.message);
  };

  return (
    <Modal open onClose={onClose} title={`Edit fleet ${fleet.plate_number}`} fullScreenOnMobile>
      <form onSubmit={submit} aria-label="Edit fleet">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Plate number" required><input value={form.plate_number} onChange={set('plate_number')} required className={INPUT} /></Label>
          <Label text="Body number" required hint="Shown to passengers"><input value={form.body_no} onChange={set('body_no')} maxLength={30} required className={INPUT} /></Label>
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
          <Label text="Vehicle class" required>
            <select aria-label="Vehicle class" value={form.vehicle_class} onChange={set('vehicle_class')} required className={INPUT}>
              <option value="">Choose a vehicle class</option>
              {fareOptions.vehicle_classes.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
            </select>
          </Label>
          <Label text="Seats" required hint="At least 20. Standing passengers are not allowed."><input type="number" min="20" max="100" value={form.seated_capacity} onChange={set('seated_capacity')} required className={INPUT} /></Label>
          <Label text="Operating start" required hint="Trips can leave from this time"><input type="time" value={form.operating_start_time} onChange={set('operating_start_time')} required className={INPUT} /></Label>
          <Label text="Operating end" required hint="Until this time (it may be after midnight)"><input type="time" value={form.operating_end_time} onChange={set('operating_end_time')} required className={INPUT} /></Label>
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

// Batch 60 (user, 2026-11-11): `trip` is the trip asked for (a dashboard or crew alert), else the bus's running or late
// trip. The advice shown is this trip's own (it used to be matched by route name, so another bus's late trip showed here).
function TrackFleetModal({ row, trip, advice, saving, error, onDecide, onClose, onOpenGoogleMaps }) {
  const pct = trip ? loadPct(trip) : null;
  const tripAdvice = trip ? advice.find((item) => Number(item.tripId) === Number(trip.trip_id)) : null;
  const running = trip ? LIVE_STATUSES.includes(String(trip.status).toLowerCase()) : false;
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
          {!running && (
            <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-testid="track-not-running">
              Trip #{trip.trip_id} has not left yet, so there is no live position for it. The map shows the bus&apos;s last known position, if any.
            </p>
          )}
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
            {/* Batch 76 (user): the leg's passenger count, the figures an inspector checks against the bus. */}
            <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Passengers</dt><dd data-testid="passenger-count-line" className="font-semibold text-slate-900">{passengerCountLine(trip.passenger_count)}</dd></div>
            <div><dt className="text-xs text-slate-500">Trip status</dt><dd className="font-semibold capitalize text-slate-900">{String(trip.status).replace('-', ' ')}</dd></div>
          </dl>
          <section aria-label="Reroute advice">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Reroute advice</h3>
            {tripAdvice ? (
              <ul><RerouteAdviceItem item={tripAdvice} saving={saving} onDecide={onDecide} /></ul>
            ) : <OpEmpty>No reroute advice for this trip right now.</OpEmpty>}
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
export default function FleetsPage({ fleets, routes, trips, onRefresh, companyName = null, trackRequest = null, onTrackHandled = () => {}, view = 'fleets', onViewChange = () => {} }) {
  // Batch 61 (advisor, 2026-11-13): the fare rules were below the fleet list and went unnoticed; they are a tab now.
  const showFleets = view !== 'fareRules';
  const nowMs = useNow();
  const fareOptions = useFareOptions();
  const {
    manageMsg, clearManageMsg, manageSaving, fleetForm, setFleetForm,
    fleetLocations, refreshFleetLocations, handleCreateFleet, openFleetMap, handleUpdateFleet,
  } = useFleetsTab({ onRefresh });
  const { savingTripId, error, decide } = useDispatchAdvice({ onSaved: onRefresh });

  const [filter, setFilter] = useState('all');
  // Batch 53 item 7 (user's design): search by plate or body number; a card per bus, details on demand.
  const [query, setQuery] = useState('');
  const [openDetails, setOpenDetails] = useState(null);
  const [modal, setModal] = useState(null); // 'add' | null
  const [trackedFleetId, setTrackedFleetId] = useState(null);
  // Batch 60: the trip an alert asked about (null: the bus's running or late trip).
  const [trackedTripId, setTrackedTripId] = useState(null);
  const [editingFleet, setEditingFleet] = useState(null);
  const canManage = useCanManageCompany();
  const [notice, setNotice] = useState('');

  const rows = useMemo(() => buildFleetRows({ fleets, trips, locations: fleetLocations, nowMs }), [fleets, trips, fleetLocations, nowMs]);
  const needle = query.trim().toLowerCase();
  const shown = filterFleetRows(rows, filter).filter((row) => !needle || [row.fleet.plate_number, row.fleet.body_no, row.fleet.bus_company_name].some((v) => String(v || '').toLowerCase().includes(needle)));
  const counts = (key) => rows.filter((row) => row.status.key === key).length;
  const dashboard = useMemo(() => buildDashboardView({ trips, fleets, locations: fleetLocations, nowMs }), [trips, fleets, fleetLocations, nowMs]);
  const tracked = rows.find((row) => row.fleetId === trackedFleetId) || null;
  const trackedTrip = tracked
    ? ((trackedTripId && (trips || []).find((trip) => Number(trip.trip_id) === Number(trackedTripId))) || tracked.trackTrip)
    : null;

  // Batch 60 (user, 2026-11-11): a dashboard alert or a crew alert's "Track bus" opens that bus's Track popup here. Each
  // click is a new request object; it is taken once (state adjusted while rendering), then the portal clears it.
  const [takenRequest, setTakenRequest] = useState(null);
  if (trackRequest && trackRequest !== takenRequest) {
    setTakenRequest(trackRequest);
    const tripId = trackRequest.tripId ? Number(trackRequest.tripId) : null;
    const fromTrip = tripId ? (trips || []).find((trip) => Number(trip.trip_id) === tripId) : null;
    const fleetId = Number(trackRequest.fleetId) || (fromTrip ? fleetIdOf(fromTrip) : null);
    if (fleetId && rows.some((row) => row.fleetId === fleetId)) {
      setTrackedFleetId(fleetId);
      setTrackedTripId(tripId);
    } else {
      setNotice(tripId ? `Trip #${tripId} is not in the loaded list. Choose Refresh and try again.` : 'That bus is not in your fleet list.');
    }
  }
  useEffect(() => {
    if (trackRequest) onTrackHandled();
  }, [trackRequest, onTrackHandled]);
  const classLabel = (key) => fareOptions.vehicle_classes.find((entry) => entry.key === key)?.label;

  const closeModal = () => setModal(null);
  const submitFleet = async (event) => { if (await handleCreateFleet(event)) { setModal(null); setNotice('Fleet created successfully.'); } };
  const open = (which) => { setNotice(''); clearManageMsg(); setModal(which); };


  return (
    <div className={OP_SPACE.stack}>
      <OpPageHeader
        title="Fleets"
        subtitle="Your buses, their status today and where they are"
        action={canManage && showFleets ? <button type="button" onClick={() => open('add')} className={PRIMARY}><Plus className="h-4 w-4" aria-hidden="true" /> Add fleet</button> : null}
      />
      <ViewTabs label="Fleets views" tabs={[{ key: 'fleets', label: 'Fleets' }, { key: 'fareRules', label: 'Fare rules' }]} value={showFleets ? 'fleets' : 'fareRules'} onChange={onViewChange} />

      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}

      {showFleets && (<>
      {/* Batch 60 item 4 (user, 2026-11-11): Fleets, Active and Idle only; a running bus counts as Active. */}
      <section aria-label="Fleet summary" className="grid grid-cols-3 gap-3 sm:gap-4">
        <OpStat icon={Bus} accent="blue" label="Fleets" value={rows.length} />
        <OpStat icon={Clock} accent="green" label="Active" value={counts('active')} tone="info" hint="trip under way or still to run today" />
        <OpStat icon={Pause} accent="orange" label="Idle" value={counts('idle')} hint="no trip left today" />
      </section>

      <OpCard
        title="Fleet list"
        subtitle="Status is worked out from today's trips and the bus's last GPS report."
        badge={(
          <div className={OP_SPACE.inline}>
            <button type="button" onClick={() => { onRefresh(); void refreshFleetLocations(); }} className={SECONDARY}><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh</button>
          </div>
        )}
      >
        <label className="mb-3 block">
          <span className="sr-only">Search fleets</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plate or body number..." className={`${INPUT} rounded-full px-4`} data-testid="fleet-search" />
        </label>
        <FilterTabs options={FLEET_FILTERS.filter((option) => option.value !== 'inactive' || counts('inactive') > 0).map((option) => ({ ...option, label: `${option.label} (${option.value === 'all' ? rows.length : counts(option.value)})` }))} value={filter} onChange={setFilter} className="mb-2" />
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
                    <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      <OpChip tone={row.status.tone}>{row.status.label}</OpChip>
                      {/* Batch 60 item 4: Offline is no longer a group, so a running bus without live GPS says so here. */}
                      {row.liveTrip && row.gps.state !== 'live' && <OpChip tone="warning">{row.gps.state === 'off_route' ? 'Off route' : 'No GPS'}</OpChip>}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3">
                    <div><dt className="text-xs text-slate-500">Capacity</dt><dd className="font-semibold text-slate-900">{row.fleet.capacity ?? '-'} passengers</dd></div>
                    <div><dt className="text-xs text-slate-500">Operating hours</dt><dd className="font-semibold text-slate-900" data-testid="fleet-hours">{operatingHoursText(row.fleet)}</dd></div>
                  </dl>
                  {expanded && (
                    <dl className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm" data-testid="fleet-details">
                      <div><dt className="text-xs text-slate-500">Type</dt><dd className="text-slate-900">{row.fleet.fleet_type || 'public'} · {classLabel(row.fleet.vehicle_class) || 'Bus type not set'}</dd></div>
                      <div><dt className="text-xs text-slate-500">Routes it has run</dt><dd className="text-slate-900">{row.routes.length ? row.routes.join(', ') : 'None yet'}</dd></div>
                      <div><dt className="text-xs text-slate-500">Seats</dt><dd className="text-slate-900">{row.fleet.seated_capacity ?? 0} seats</dd></div>
                      <div><dt className="text-xs text-slate-500">Current or next trip</dt><dd className="text-slate-900">{row.nextTripLabel ?? 'No trip left today'}</dd></div>
                      <div><dt className="text-xs text-slate-500">GPS</dt><dd className="text-slate-900">{row.liveTrip ? (row.gps.state === 'live' ? 'Live' : row.gps.state === 'none' ? 'No GPS' : row.gps.state === 'stale' ? 'Out of date' : row.gps.state === 'weak' ? 'Weak signal' : 'Off route') : (row.lastSeen ? `Last seen ${row.lastSeen}` : '-')}{row.liveTrip && row.lastSeen ? ` · ${row.lastSeen}` : ''}</dd></div>
                    </dl>
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={!row.trackable}
                      title={row.trackable ? undefined : 'Tracking is available while a trip is boarding, on the road or late leaving'}
                      aria-label={`Track fleet ${row.fleet.plate_number}`}
                      onClick={() => { setTrackedFleetId(row.fleetId); setTrackedTripId(null); }}
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

      </>)}

      {!showFleets && (
        <OpCard>
          <FareRulesPanel service={OperatorService} fleets={fleets} routes={routes} canCreateGeneral={canManage} tone="light" readOnly={!canManage} />
        </OpCard>
      )}

      <AddFleetModal companyName={companyName} open={modal === 'add'} onClose={closeModal} form={fleetForm} setForm={setFleetForm} fareOptions={fareOptions} saving={manageSaving} message={manageMsg} onSubmit={submitFleet} />
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
      <TrackFleetModal
        row={tracked}
        trip={trackedTrip}
        advice={dashboard.advice}
        saving={savingTripId}
        error={error}
        onDecide={(item, decision, note) => decide(item.tripId, decision, decisionPayload(item, decision, note))}
        onClose={() => { setTrackedFleetId(null); setTrackedTripId(null); }}
        onOpenGoogleMaps={() => openFleetMap(trackedFleetId)}
      />
    </div>
  );
}
