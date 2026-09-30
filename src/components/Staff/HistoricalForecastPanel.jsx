import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { buildOperatorForecast, filterForecastTrips } from './routeForecast'
import { FORECAST_CONFIG } from '../../config/forecastConfig'
import { openPrintReport } from '../../utils/printReport'

const money = (v) => {
  const n = Number(v)
  return Number.isNaN(n) ? '-' : `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

const riskSeverity = (risk) => {
  const value = Number(risk || 0)
  const bands = FORECAST_CONFIG.severityBands
  if (value >= bands.severe) return { label: 'Severe', tone: 'bg-red-100 text-red-700', bar: 'bg-red-500' }
  if (value >= bands.high) return { label: 'High', tone: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' }
  if (value >= bands.moderate) return { label: 'Moderate', tone: 'bg-yellow-100 text-yellow-700', bar: 'bg-yellow-500' }
  return { label: 'Low', tone: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' }
}

const PRINT_COLUMNS = ['route', 'trips', 'revenue', 'completion_rate', 'risk_score', 'status']

/**
 * B6: Historical Forecast, moved under Operator > Reports. It reads the
 * Operator's own trips (already scoped to that Operator by the API), so the
 * access level is the same as the Reports tab it now lives in.
 */
export default function HistoricalForecastPanel({ trips, routes, fleets }) {
  const [filters, setFilters] = useState({ from: '', to: '', routeId: '', fleetId: '' })
  const [msg, setMsg] = useState('')
  const setFilter = (key) => (event) => setFilters((prev) => ({ ...prev, [key]: event.target.value }))

  const filtered = useMemo(() => filterForecastTrips(trips, filters), [trips, filters])
  const forecast = useMemo(() => buildOperatorForecast(filtered), [filtered])
  const severity = riskSeverity(forecast.forecastRisk)

  const handleExport = () => {
    if (forecast.routePerformance.length === 0) {
      setMsg('No trips match the filters, so there is nothing to export.')
      return
    }
    const rows = forecast.routePerformance.map((row) => ({
      route: row.route,
      trips: row.trips,
      revenue: money(row.revenue),
      completion_rate: `${Math.round(row.completionRate)}%`,
      risk_score: row.riskScore,
      status: row.status,
    }))
    const routeName = routes.find((r) => String(r.route_id) === String(filters.routeId))?.route_name || 'All routes'
    const fleetName = fleets.find((f) => String(f.fleet_id) === String(filters.fleetId))?.plate_number || 'All fleets'
    const opened = openPrintReport({
      title: 'Historical Forecast',
      meta: [['Report', 'Historical Forecast (heuristic estimate)'], ['From', filters.from || 'Any'], ['To', filters.to || 'Any'], ['Route', routeName], ['Fleet', fleetName]],
      columns: PRINT_COLUMNS,
      rows,
    })
    setMsg(opened ? '' : 'Unable to open print preview. Please allow pop-ups for this site.')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-36 flex-1 text-xs font-medium text-slate-600">From
          <input type="date" value={filters.from} max={filters.to || undefined} onChange={setFilter('from')} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
        </label>
        <label className="min-w-36 flex-1 text-xs font-medium text-slate-600">To
          <input type="date" value={filters.to} min={filters.from || undefined} onChange={setFilter('to')} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
        </label>
        <label className="min-w-36 flex-1 text-xs font-medium text-slate-600">Route
          <select value={filters.routeId} onChange={setFilter('routeId')} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All routes</option>
            {routes.map((r) => <option key={r.route_id} value={r.route_id}>{r.route_name}</option>)}
          </select>
        </label>
        <label className="min-w-36 flex-1 text-xs font-medium text-slate-600">Fleet
          <select value={filters.fleetId} onChange={setFilter('fleetId')} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All fleets</option>
            {fleets.map((f) => <option key={f.fleet_id} value={f.fleet_id}>{f.plate_number}</option>)}
          </select>
        </label>
        <button type="button" onClick={handleExport} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <Download className="h-4 w-4" />
          Print / Save PDF
        </button>
      </div>
      {msg && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{msg}</p>}
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">{FORECAST_CONFIG.heuristicNotice}</p>

      <div className="staff-card staff-card-roomy">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Historical Forecast</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">{forecast.totalTrips} trips</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Avg. revenue</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{money(forecast.avgRevenue)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Traffic risk severity</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{Math.round(forecast.forecastRisk)}%</p>
            <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] ${severity.tone}`}>{severity.label}</span>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Most at-risk route</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{forecast.highestRisk?.route || 'No risk route detected'}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {Object.entries(forecast.timeSlotForecast ?? {}).map(([slot, value]) => (
            <div key={slot} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{value.label} ({FORECAST_CONFIG.timeSlots[slot]?.window || 'Peak window'})</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{value.risk}%</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full ${riskSeverity(value.risk).bar}`} style={{ width: `${Math.min(100, Math.max(0, Number(value.risk || 0)))}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-600">{value.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
