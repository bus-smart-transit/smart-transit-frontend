import { useState } from 'react';
import { OpCard } from './OperatorUI';
import useRouteFareTable from '../../../api/hooks/Staff/useRouteFareTable';
import { assignmentsOnRoute } from '../../../utils/operatorRouteView';
import { busLabelText } from '../../../utils/busLabel';

const SELECT = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800';
const peso = (amount) => `PHP ${Number(amount).toFixed(2)}`;

/**
 * Batch 75 (panel, 2026-11-15): the fares this route's stops produce, listed the way passengers see them
 * ("{from stop} → {to stop}  PHP {fare}"). Read-only; fare rules are edited in Fleets, Fare rules.
 */
export default function RouteFareTable({ service, routeId, fleets }) {
  const buses = assignmentsOnRoute(routeId, fleets).filter((item) => item.fleetRouteId);
  const [picked, setPicked] = useState({ fleetRouteId: '', direction: 'outbound', serviceType: 'regular', originStopId: '' });
  const fleetRouteId = picked.fleetRouteId || (buses[0]?.fleetRouteId ? String(buses[0].fleetRouteId) : '');
  const { loading, error, table } = useRouteFareTable({ service, routeId, filters: { ...picked, fleetRouteId } });
  // Changing the bus, direction or service starts again from the first stop.
  const change = (key) => (event) => setPicked((prev) => ({ ...prev, [key]: event.target.value, ...(key === 'originStopId' ? {} : { originStopId: '' }) }));

  if (buses.length === 0) {
    return (
      <OpCard title="Fares">
        <p className="text-sm text-slate-600">No bus runs this route yet. Assign it to a bus from the Fleets page to see its fares.</p>
      </OpCard>
    );
  }

  return (
    <OpCard title="Fares" subtitle="What passengers pay between stops, worked out the same way as on the passenger site. To change a fare, edit the fare rules in Fleets, Fare rules.">
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold text-slate-600">Bus
          <select className={SELECT} value={fleetRouteId} onChange={change('fleetRouteId')} data-testid="fare-table-bus">
            {buses.map((item) => (
              <option key={item.key} value={item.fleetRouteId}>{busLabelText(item.fleet?.bus_label) || item.fleet?.plate_number || `Bus ${item.fleet?.fleet_id}`}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">Direction
          <select className={SELECT} value={picked.direction} onChange={change('direction')} data-testid="fare-table-direction">
            <option value="outbound">Going (outbound)</option>
            <option value="reverse">Return (reverse)</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">Service
          <select className={SELECT} value={picked.serviceType} onChange={change('serviceType')} data-testid="fare-table-service">
            <option value="regular">Regular</option>
            <option value="express">Express</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">From
          <select className={SELECT} value={picked.originStopId || String(table?.origin?.stop_id ?? '')} onChange={change('originStopId')} data-testid="fare-table-origin">
            {(table?.origins || []).map((stop) => <option key={stop.stop_id} value={stop.stop_id}>{stop.name || 'Not provided'}</option>)}
          </select>
        </label>
      </div>

      {table?.vehicle_class && (
        <p className="mb-2 text-xs text-slate-500">
          {table.bus_label || 'This bus'} · {table.vehicle_class} · {table.service_type === 'express' ? 'Express' : 'Regular'} · fare rules in force today
        </p>
      )}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading fares...</p>}
      {!loading && !error && table && (table.rows.length === 0 ? (
        <p className="text-sm text-slate-600">{table.service_type === 'express' ? 'This route has no express stops after this one.' : 'No stops after this one.'}</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200" data-testid="fare-table-rows">
          {table.rows.map((row) => (
            <li key={row.stop_id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="min-w-0 text-slate-800">{table.origin?.name || 'Not provided'} → {row.name || 'Not provided'}</span>
              <span className={`shrink-0 font-data font-bold ${row.fare === null ? 'text-slate-400' : 'text-navy-950'}`}>{row.fare === null ? 'Fare unavailable' : peso(row.fare)}</span>
            </li>
          ))}
        </ul>
      ))}
    </OpCard>
  );
}
