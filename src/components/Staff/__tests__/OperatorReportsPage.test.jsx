import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import OperatorReportsPage from '../OperatorReportsPage';

const mocks = vi.hoisted(() => ({
  getRouteAdherence: vi.fn(),
  getOccupancyTrends: vi.fn(),
  getDailySummary: vi.fn(),
}));

vi.mock('../../../api/StaffService/OperatorService', () => ({ default: mocks }));

const fleets = [{ fleet_id: 3, plate_number: 'BUS-003' }];

describe('OperatorReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRouteAdherence.mockResolvedValue({ data: { trips: [] } });
    mocks.getOccupancyTrends.mockResolvedValue({ data: { occupancy: {}, peak_hours: {} } });
    mocks.getDailySummary.mockResolvedValue({ data: { date: '2026-10-18', summary: {} } });
  });

  it('separates GPS-measured stop coverage from completion proxies', async () => {
    mocks.getRouteAdherence.mockResolvedValue({ data: {
      period: { start_date: '2026-10-01', end_date: '2026-10-18' },
      summary: { total_trips: 2, trips_with_gps_data: 1, trips_with_proxy_data: 1, avg_stop_coverage_pct: 60, deviated_trips: 1, adherence_rate_pct: 0 },
      trips: [
        { trip_id: 17, trip_date: '2026-10-08', status: 'completed', stops_scheduled: 5, stops_visited: 3, stop_coverage_pct: 60, gps_points: 18, data_source: 'gps' },
        { trip_id: 18, trip_date: '2026-10-09', status: 'completed', stop_coverage_pct: 100, gps_points: 0, data_source: 'proxy' },
      ],
    } });

    render(<OperatorReportsPage fleets={fleets} />);
    fireEvent.change(screen.getByLabelText('Fleet'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run report' }));

    expect(await screen.findByRole('table', { name: 'Trip stop coverage' })).toBeInTheDocument();
    const gpsMetric = screen.getByText('GPS-verified trips').parentElement;
    const proxyMetric = screen.getByText('Completion proxies').parentElement;
    expect(within(gpsMetric).getByText('1')).toBeInTheDocument();
    expect(within(proxyMetric).getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Not measured')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Historical Forecast' })).not.toBeInTheDocument();
  });

  it('shows occupancy by scheduled departure hour', async () => {
    mocks.getOccupancyTrends.mockResolvedValue({ data: {
      capacity: 40,
      occupancy: { average: 15, peak: 24, minimum: 6, average_utilization_percentage: 37.5, peak_utilization_percentage: 60 },
      peak_hours: { 7: 10, 9: 20 },
      trips_completed: 4,
    } });

    render(<OperatorReportsPage fleets={fleets} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Occupancy Trends' }));
    fireEvent.change(screen.getByLabelText('Fleet'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-18' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run report' }));

    expect(await screen.findByRole('region', { name: 'Average occupancy by scheduled departure hour' })).toBeInTheDocument();
    expect(screen.getByText('07:00')).toBeInTheDocument();
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(mocks.getOccupancyTrends).toHaveBeenCalledWith('3', { start_date: '2026-10-01', end_date: '2026-10-18' });
  });

  it('sends one date to Daily Summary and renders operational metrics', async () => {
    mocks.getDailySummary.mockResolvedValue({ data: {
      date: '2026-10-12',
      summary: { total_trips: 8, completed_trips: 5, active_trips: 2, total_revenue: 12450, total_tickets: 36, average_occupancy: 7.2 },
    } });

    render(<OperatorReportsPage fleets={fleets} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Daily Summary' }));
    fireEvent.change(screen.getByLabelText('Fleet'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Report date'), { target: { value: '2026-10-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run report' }));

    expect(await screen.findByText('PHP 12,450.00')).toBeInTheDocument();
    expect(screen.getByTestId('report-period')).toHaveTextContent('2026-10-12');
    await waitFor(() => expect(mocks.getDailySummary).toHaveBeenCalledWith('3', { date: '2026-10-12' }));
  });
});