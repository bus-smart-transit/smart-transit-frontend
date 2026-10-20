import { Download, Eye, Loader2 } from 'lucide-react';
import { useReportsTab } from '../../api/hooks/Staff/useOperatorDashboard';
import { openPrintReport } from '../../utils/printReport';
import { reportFileName, reportToCsv } from '../../utils/reportCsv';
import { saveCsv } from '../../utils/financials';

const REPORTS = [
  { key: 'adherence', label: 'Route Adherence' },
  { key: 'occupancy', label: 'Occupancy Trends' },
  { key: 'daily', label: 'Daily Summary' },
];

const numberText = (value, digits = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('en-PH', { maximumFractionDigits: digits }) : '-';
};

const percentText = (value) => value == null || !Number.isFinite(Number(value)) ? '-' : `${numberText(value, 1)}%`;
const pesoText = (value) => value == null || !Number.isFinite(Number(value))
  ? '-'
  : `PHP ${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Metric({ label, value, detail }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

function EmptyReport({ children }) {
  return <p className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">{children}</p>;
}

function adherenceRows(report) {
  return (Array.isArray(report?.trips) ? report.trips : []).filter((trip) => trip.data_source === 'gps');
}

function exportRowsFor(reportType, report) {
  if (reportType === 'adherence') {
    return (Array.isArray(report?.trips) ? report.trips : []).map((trip) => ({
      trip_id: trip.trip_id,
      trip_date: String(trip.trip_date || '').slice(0, 10),
      status: trip.status,
      data_source: trip.data_source === 'gps' ? 'GPS measured' : 'Completion proxy',
      gps_points: trip.gps_points ?? 0,
      stops_scheduled: trip.data_source === 'gps' ? trip.stops_scheduled : null,
      stops_visited: trip.data_source === 'gps' ? trip.stops_visited : null,
      stop_coverage_pct: trip.data_source === 'gps' ? trip.stop_coverage_pct : null,
    }));
  }

  if (reportType === 'occupancy') {
    return Object.entries(report?.peak_hours || {})
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([hour, average]) => ({
        departure_hour: `${String(hour).padStart(2, '0')}:00`,
        average_occupancy: Number(average),
        capacity: Number(report?.capacity || 0),
        average_utilization_pct: Number(report?.capacity) > 0 ? (Number(average) / Number(report.capacity)) * 100 : null,
      }));
  }

  if (reportType === 'daily' && report?.summary) {
    return [{
      date: report.date,
      total_trips: report.summary.total_trips,
      completed_trips: report.summary.completed_trips,
      active_trips: report.summary.active_trips,
      total_tickets: report.summary.total_tickets,
      average_occupancy: report.summary.average_occupancy,
      gross_paid_revenue_php: report.summary.total_revenue,
    }];
  }

  return [];
}

function RouteAdherenceReport({ report }) {
  const trips = Array.isArray(report?.trips) ? report.trips : [];
  const gpsTrips = adherenceRows(report);
  const proxyTrips = trips.filter((trip) => trip.data_source === 'proxy');
  const measured = gpsTrips.filter((trip) => Number.isFinite(Number(trip.stop_coverage_pct)));
  const averageCoverage = measured.length
    ? measured.reduce((total, trip) => total + Number(trip.stop_coverage_pct), 0) / measured.length
    : null;
  const deviated = measured.filter((trip) => Number(trip.stop_coverage_pct) < 80).length;
  const adherenceRate = measured.length ? ((measured.length - deviated) / measured.length) * 100 : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="GPS-verified trips" value={numberText(measured.length)} />
        <Metric label="GPS stop coverage" value={percentText(averageCoverage)} detail="Average across measured trips" />
        <Metric label="Trips below 80%" value={numberText(deviated)} detail={`GPS-only adherence ${percentText(adherenceRate)}`} />
        <Metric label="Completion proxies" value={numberText(proxyTrips.length)} detail="Shown separately; excluded from GPS rate" />
      </div>
      <p className="text-xs text-slate-500">A scheduled stop is counted as visited when recorded GPS is within 300 m. This measures stop coverage, not ordered route-path adherence.</p>
      {trips.length === 0 ? <EmptyReport>No trips in this fleet and period.</EmptyReport> : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full text-sm" data-testid="adherence-table">
            <caption className="sr-only">Trip stop coverage</caption>
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>{['Trip', 'Date', 'Status', 'Stop coverage', 'Stops visited', 'GPS points', 'Data basis'].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr>
            </thead>
            <tbody>
              {trips.map((trip) => {
                const isGps = trip.data_source === 'gps';
                const coverage = isGps ? Number(trip.stop_coverage_pct) : null;
                return (
                  <tr key={trip.trip_id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-800">#{trip.trip_id}</td>
                    <td className="px-3 py-2 text-slate-600">{String(trip.trip_date || '').slice(0, 10) || '-'}</td>
                    <td className="px-3 py-2 capitalize text-slate-600">{trip.status || '-'}</td>
                    <td className="min-w-40 px-3 py-2">
                      {isGps ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full ${coverage < 80 ? 'bg-amber-500' : 'bg-teal-600'}`} style={{ width: `${Math.min(100, Math.max(0, coverage || 0))}%` }} />
                          </div>
                          <span className="w-12 text-right text-xs font-semibold">{percentText(coverage)}</span>
                        </div>
                      ) : <span className="text-slate-400">Not measured</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{isGps ? `${trip.stops_visited ?? 0} / ${trip.stops_scheduled ?? 0}` : '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{numberText(trip.gps_points ?? 0)}</td>
                    <td className="px-3 py-2"><span className={`rounded-sm px-2 py-1 text-xs font-semibold ${isGps ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>{isGps ? 'GPS' : 'Completion proxy'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OccupancyReport({ report }) {
  const occupancy = report?.occupancy || {};
  const hours = Object.entries(report?.peak_hours || {}).sort(([left], [right]) => Number(left) - Number(right));
  const maxValue = Math.max(1, ...hours.map(([, value]) => Number(value) || 0));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Trips in period" value={numberText(report?.trips_completed)} />
        <Metric label="Average passengers" value={numberText(occupancy.average, 1)} detail="Trips with passengers" />
        <Metric label="Peak passengers" value={numberText(occupancy.peak)} detail={percentText(occupancy.peak_utilization_percentage) + ' of fleet capacity'} />
        <Metric label="Average utilization" value={percentText(occupancy.average_utilization_percentage)} detail={`${numberText(report?.capacity)} passenger capacity`} />
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-4" aria-label="Average occupancy by scheduled departure hour">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Average passengers by scheduled departure hour</h3>
        {hours.length === 0 ? <EmptyReport>No occupancy data in this fleet and period.</EmptyReport> : (
          <div className="space-y-3">
            {hours.map(([hour, rawValue]) => {
              const value = Number(rawValue) || 0;
              return (
                <div key={hour} className="grid grid-cols-[3.5rem_minmax(0,1fr)_5rem] items-center gap-3" data-testid="occupancy-hour-row">
                  <span className="font-mono text-xs text-slate-600">{String(hour).padStart(2, '0')}:00</span>
                  <div className="h-3 overflow-hidden rounded-sm bg-slate-100">
                    <div className="h-full bg-teal-600" style={{ width: `${Math.min(100, (value / maxValue) * 100)}%` }} />
                  </div>
                  <span className="text-right text-xs font-semibold text-slate-700">{numberText(value, 1)} avg</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function DailySummaryReport({ report }) {
  const summary = report?.summary || {};
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Trips" value={numberText(summary.total_trips)} />
        <Metric label="Completed trips" value={numberText(summary.completed_trips)} />
        <Metric label="Active trips" value={numberText(summary.active_trips)} />
        <Metric label="Paid tickets" value={numberText(summary.total_tickets)} />
        <Metric label="Average occupancy" value={numberText(summary.average_occupancy, 1)} detail="Across completed trips" />
        <Metric label="Gross paid revenue" value={pesoText(summary.total_revenue)} detail="Refunds and net revenue are in Finance" />
      </div>
    </div>
  );
}

export default function OperatorReportsPage({ fleets = [] }) {
  const {
    selectedFleet, setSelectedFleet,
    reportType, setReportType,
    startDate, setStartDate,
    endDate, setEndDate,
    ranRange,
    report,
    loading,
    msg, setMsg,
    fetchReport,
  } = useReportsTab();

  const reportRows = exportRowsFor(reportType, report);
  const reportColumns = reportRows.length ? Object.keys(reportRows[0]) : [];
  const fleetLabel = fleets.find((fleet) => String(fleet.fleet_id) === String(selectedFleet))?.plate_number || selectedFleet;
  const periodLabel = reportType === 'daily'
    ? (ranRange.from || 'Today')
    : (ranRange.from || ranRange.to ? `${ranRange.from || 'start of month'} to ${ranRange.to || 'today'}` : 'This month to date');
  const reportLabel = REPORTS.find((item) => item.key === reportType)?.label || 'Fleet report';

  const formatExportValue = (value) => {
    if (value == null || value === '') return '-';
    return typeof value === 'number' ? numberText(value, 1) : String(value);
  };

  const handlePrint = () => {
    if (!reportRows.length) return;
    const opened = openPrintReport({
      title: `${reportLabel} - ${fleetLabel}`,
      meta: [['Fleet', fleetLabel], ['Report', reportLabel], ['Period', periodLabel]],
      columns: reportColumns,
      rows: reportRows,
      format: formatExportValue,
    });
    if (!opened) setMsg('Unable to open print preview. Please allow pop-ups for this site.');
  };

  const handleDownloadCsv = () => {
    if (!reportRows.length) return;
    saveCsv(
      reportToCsv(reportColumns, reportRows, formatExportValue),
      reportFileName({ type: reportType, fleet: fleetLabel, from: ranRange.from, to: ranRange.to }),
    );
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Fleet Reports</h1>
      </header>

      <div role="tablist" aria-label="Report type" className="flex flex-wrap gap-2 border-b border-slate-200">
        {REPORTS.map(({ key, label }) => (
          <button key={key} type="button" role="tab" aria-selected={reportType === key} onClick={() => setReportType(key)} className={`border-b-2 px-3 py-2 text-sm font-semibold ${reportType === key ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_auto_auto_auto] xl:items-end">
        <label className="block text-xs font-medium text-slate-600">Fleet
          <select value={selectedFleet} onChange={(event) => setSelectedFleet(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">Select fleet</option>
            {fleets.map((fleet) => <option key={fleet.fleet_id} value={fleet.fleet_id}>{fleet.plate_number}</option>)}
          </select>
        </label>
        {reportType === 'daily' ? (
          <label htmlFor="report-date" className="block text-xs font-medium text-slate-600">Report date
            <input id="report-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500" />
          </label>
        ) : (
          <>
            <label htmlFor="report-from" className="block text-xs font-medium text-slate-600">From
              <input id="report-from" type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500" />
            </label>
            <label htmlFor="report-to" className="block text-xs font-medium text-slate-600">To
              <input id="report-to" type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500" />
            </label>
          </>
        )}
        <button type="button" onClick={fetchReport} disabled={loading || !selectedFleet} className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          Run report
        </button>
        <button type="button" onClick={handlePrint} disabled={!reportRows.length} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <Download className="h-4 w-4" /> Print / PDF
        </button>
        <button type="button" onClick={handleDownloadCsv} disabled={!reportRows.length} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>

      {msg && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{msg}</p>}
      {!report && !loading && <EmptyReport>Select a fleet and run a report.</EmptyReport>}
      {report && (
        <section className="space-y-4" aria-label={`${reportLabel} results`}>
          <p className="text-xs text-slate-500" data-testid="report-period">{reportType === 'daily' ? 'Date' : 'Period'}: {periodLabel}</p>
          {reportType === 'adherence' && <RouteAdherenceReport report={report} />}
          {reportType === 'occupancy' && <OccupancyReport report={report} />}
          {reportType === 'daily' && <DailySummaryReport report={report} />}
        </section>
      )}
    </div>
  );
}