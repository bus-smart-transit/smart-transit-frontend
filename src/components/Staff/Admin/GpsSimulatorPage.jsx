import { useState } from 'react';
import { nextStopToReach } from '../../../utils/simulatorStops';
import { CornerUpRight, MapPinCheck, Pause, Play, RefreshCw, Route as RouteIcon, Square } from 'lucide-react';
import { OpPageHeader, OpCard, OpChip, OpEmpty } from '../Operator/OperatorUI';
import { OP_SPACE } from '../Operator/operatorUiTokens';
import Modal from '../../ui/Modal';
import RouteMap from '../../Map/RouteMap';
import { busLabelText } from '../../../utils/busLabel';

import { SkeletonList } from '../../ui/Skeleton';
import { clock12 } from '../../../utils/clock';
const STATUS = {
  running: { tone: 'success', label: 'Running' },
  paused: { tone: 'warning', label: 'Paused' },
  stopped: { tone: 'neutral', label: 'Stopped' },
};

const BUTTON = 'inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const FIELD = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900';

function SimulationCard({ sim, speeds, busy, onControl }) {
  const [stopId, setStopId] = useState('');
  const status = STATUS[sim.status] ?? STATUS.stopped;
  // 2026-11-21 (user, demo): mark the next stop as reached for the Driver (the same rule as the Driver's tap).
  const reached = nextStopToReach(sim.stops, sim.last_acknowledged_stop_id);
  const lastReached = sim.stops.find((stop) => Number(stop.stop_id) === Number(sim.last_acknowledged_stop_id));
  return (
    <OpCard
      title={sim.route_name || `Trip ${sim.trip_id}`}
      subtitle={busLabelText(sim.bus_label)}
      badge={(
        <span className="flex flex-wrap gap-1.5">
          {sim.off_route && <OpChip tone="warning">Off route</OpChip>}
          <OpChip tone={status.tone}>{status.label} · Simulated</OpChip>
        </span>
      )}
    >
      <div className="space-y-3" data-testid="gps-simulation">
        <p className="text-sm text-slate-600">
          {sim.progress_percent === null ? 'Position: Not provided' : `${sim.progress_percent}% of the route`} · Speed {sim.speed}x
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {sim.status === 'running'
            ? <button type="button" disabled={busy} onClick={() => onControl(sim.id, { action: 'pause' })} className={BUTTON}><Pause className="h-4 w-4" aria-hidden="true" /> Pause</button>
            : <button type="button" disabled={busy} onClick={() => onControl(sim.id, { action: 'resume' })} className={BUTTON}><Play className="h-4 w-4" aria-hidden="true" /> Resume</button>}
          <button type="button" disabled={busy} onClick={() => onControl(sim.id, { action: 'stop' })} className={`${BUTTON} border-rose-200 text-rose-700 hover:bg-rose-50`}>
            <Square className="h-4 w-4" aria-hidden="true" /> Stop and give control back
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Speed
            <select aria-label="Speed" value={sim.speed} disabled={busy} onChange={(e) => onControl(sim.id, { action: 'speed', speed: Number(e.target.value) })} className={FIELD}>
              {speeds.map((speed) => <option key={speed} value={speed}>{speed}x</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Jump to stop" value={stopId} onChange={(e) => setStopId(e.target.value)} className={FIELD}>
            <option value="">Jump to a stop...</option>
            {sim.stops.map((stop) => <option key={stop.stop_id} value={stop.stop_id}>{stop.name}</option>)}
          </select>
          <button type="button" disabled={busy || !stopId} onClick={() => onControl(sim.id, { action: 'jump', stop_id: Number(stopId) })} className={BUTTON}>Jump</button>
          {/* 2026-11-19 (user): test the Off route alert, the Fleets chip and the route adherence report. */}
          {sim.off_route
            ? <button type="button" disabled={busy} onClick={() => onControl(sim.id, { action: 'rejoin' })} className={BUTTON} data-testid="sim-rejoin"><RouteIcon className="h-4 w-4" aria-hidden="true" /> Back on route</button>
            : <button type="button" disabled={busy} onClick={() => onControl(sim.id, { action: 'deviate' })} className={`${BUTTON} border-amber-200 text-amber-800 hover:bg-amber-50`} data-testid="sim-deviate"><CornerUpRight className="h-4 w-4" aria-hidden="true" /> Go off route</button>}
        </div>
        <div className="flex flex-wrap items-center gap-2" data-testid="sim-acknowledge-row">
          <button type="button" disabled={busy || !reached} onClick={() => onControl(sim.id, { action: 'acknowledge', stop_id: Number(reached.stop_id) })} className={BUTTON} data-testid="sim-acknowledge">
            <MapPinCheck className="h-4 w-4" aria-hidden="true" /> {reached ? `Mark ${reached.name || 'the next stop'} as reached` : 'Every stop is reached'}
          </button>
          <span className="text-sm text-slate-600">Last stop reached: {lastReached?.name || 'None yet'}</span>
        </div>
        <p className="text-xs text-slate-500">This marks the stop for the Driver, as if they tapped it. Passengers who did not board at the stops behind the bus are marked as missed, and the route adherence report shows the stop as Simulated.</p>
        {sim.off_route && <p className="text-xs text-amber-800">The bus is reported about 300 m to the side of its route, so the Operator sees it as off route. It keeps moving with the trip until you put it back.</p>}
        {sim.route_id && (
          <div className="h-72 overflow-hidden rounded-xl ring-1 ring-slate-200" aria-label="Live map preview">
            <RouteMap
              routeId={sim.route_id}
              direction={sim.leg_direction}
              vehicle={sim.position ? { latitude: sim.position.latitude, longitude: sim.position.longitude } : null}
            />
          </div>
        )}
      </div>
    </OpCard>
  );
}

/**
 * Batch 49 item 4: the Super Admin GPS simulator, to show tracking in the defense. Only a trip that has departed can be
 * taken over, after a confirmation. Passengers see the bus marked "Simulated"; the Driver phone's positions are set
 * aside until Stop. It stops by itself after a set time. Minimal on purpose (user: only the UI that is needed).
 */
export default function GpsSimulatorPage({ simulatorTab }) {
  const { data, loading, error, busy, reload, start, control } = simulatorTab;
  const [confirming, setConfirming] = useState(null);
  const [speed, setSpeed] = useState(5);
  const speeds = data?.speeds ?? [1, 5, 10];
  const simulations = data?.simulations ?? [];
  const trips = (data?.trips ?? []).filter((trip) => !trip.simulated);

  const confirm = async () => {
    const ok = await start(confirming.trip_id, speed);
    if (ok) setConfirming(null);
  };

  return (
    <div className={OP_SPACE.stack}>
      <OpPageHeader
        title="GPS simulator"
        subtitle="Move a departed bus along its route to show how tracking works."
        action={<button type="button" onClick={reload} className={BUTTON}><RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh</button>}
      />
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {loading && !data && <SkeletonList label="Loading..." rows={3} />}
      {data && !data.enabled && (
        <p data-testid="gps-simulator-off" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The GPS simulator is turned off. It is turned on in the server settings (GPS_SIMULATOR_ENABLED).
        </p>
      )}

      {simulations.map((sim) => <SimulationCard key={sim.id} sim={sim} speeds={speeds} busy={busy} onControl={control} />)}

      {data && (
        <OpCard title="Departed trips" subtitle={`Only a trip on the road can be simulated. It stops by itself after ${data.max_minutes} minutes.`}>
          {trips.length === 0 ? <OpEmpty>No trip is on the road right now.</OpEmpty> : (
            <ul className="divide-y divide-slate-100">
              {trips.map((trip) => (
                <li key={trip.trip_id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{trip.route_name || `Trip ${trip.trip_id}`}</span>
                    <span className="block text-xs text-slate-500">{busLabelText(trip.bus_label)} · {trip.trip_date} {clock12(trip.departure_time) || trip.departure_time}</span>
                    {!trip.has_route_line && <span className="block text-xs text-amber-700">This route has no route line yet.</span>}
                  </span>
                  <button
                    type="button"
                    disabled={!data.enabled || !trip.has_route_line || busy}
                    onClick={() => setConfirming(trip)}
                    className="min-h-11 rounded-lg bg-navy-800 px-4 text-sm font-semibold text-white hover:bg-navy-900 disabled:opacity-50"
                  >
                    Take control of GPS location
                  </button>
                </li>
              ))}
            </ul>
          )}
        </OpCard>
      )}

      <Modal open={Boolean(confirming)} onClose={() => setConfirming(null)} title="Take control of GPS location?">
        {confirming && (
          <div className="space-y-4 text-sm text-slate-700">
            <p>
              You will move <strong>{busLabelText(confirming.bus_label)}</strong> on <strong>{confirming.route_name}</strong>. Passengers will see this
              bus move, marked <strong>Simulated</strong>. The Driver phone&apos;s positions are ignored until you press Stop.
            </p>
            <label className="flex items-center gap-2">
              Speed
              <select aria-label="Starting speed" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className={FIELD}>
                {speeds.map((s) => <option key={s} value={s}>{s}x</option>)}
              </select>
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setConfirming(null)} className={BUTTON}>Cancel</button>
              <button type="button" disabled={busy} onClick={confirm} className="min-h-11 rounded-lg bg-navy-800 px-4 text-sm font-semibold text-white hover:bg-navy-900 disabled:opacity-50">
                Yes, take control
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
