import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import OperatorDashboardPage from '../OperatorDashboardPage';
import { getBusinessToday } from '../../../../utils/dates';

const mocks = vi.hoisted(() => ({
  getFleetLocations: vi.fn(),
  getRouteAdherence: vi.fn(),
  saveDispatchDecision: vi.fn(),
}));

vi.mock('../../../../api/StaffService/OperatorService', () => ({ default: mocks }));
vi.mock('../../CalendarSummaryStrip', () => ({ default: () => <div>calendar-summary</div> }));
vi.mock('../../DashboardCalendar', () => ({ default: () => <div>dashboard-calendar</div> }));

const today = getBusinessToday();
const fleet = { fleet_id: 1, plate_number: 'PLT-1', capacity: 40, seated_capacity: 30, standing_capacity: 10, status: 'active', fleet_routes: [] };
const trip = (id, extra = {}) => ({
  trip_id: id, trip_date: today, departure_time: '08:00:00', status: 'scheduled', total_occupancy: 8,
  driver: { user: { name: 'Dina Driver' } }, conductor: { user: { name: 'Carl Conductor' } },
  fleet_route: { fleet_id: 1, route_id: 10, fleet, route: { route_id: 10, route_name: 'Davao - Tagum' } },
  ...extra,
});

const renderPage = (props = {}) => render(
  <OperatorDashboardPage trips={[]} drivers={[]} conductors={[]} fleets={[fleet]} onRefresh={vi.fn()} onOpenCalendar={vi.fn()} onOpenSchedule={vi.fn()} {...props} />,
);

describe('OperatorDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFleetLocations.mockResolvedValue({ data: [] });
    mocks.getRouteAdherence.mockResolvedValue({ data: { summary: { trips_with_gps_data: 0, deviated_trips: 0, adherence_rate_pct: null } } });
    mocks.saveDispatchDecision.mockResolvedValue({});
  });

  it('shows the real figures and never a revenue card or a peso amount of zero', async () => {
    renderPage({ trips: [trip(1, { status: 'departed', total_occupancy: 12 }), trip(2, { total_occupancy: 8 })] });
    const glance = screen.getByRole('region', { name: 'Today at a glance' });
    expect(within(glance).getByText('Tickets sold').parentElement.parentElement).toHaveTextContent('20');
    expect(within(glance).getByText('Active buses').parentElement.parentElement).toHaveTextContent('1');
    expect(screen.queryByText(/revenue/i)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/₱0\.00/);
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
  });

  // Batch 60 item 4 (user, 2026-11-11): only quick actions and the important information stay on the dashboard.
  it('no longer shows the trips table, the charts, route adherence or the dispatch decision board', async () => {
    renderPage({ trips: [trip(7, { status: 'delayed' })] });
    for (const title of ["Today's trips", 'Tickets sold against capacity', 'Trips today by status', 'Route adherence', 'Dispatch decision board']) {
      expect(screen.queryByText(title)).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Acknowledge advice' })).not.toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Recommended actions')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Route delay overview' })).toBeInTheDocument();
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
    expect(mocks.getRouteAdherence).not.toHaveBeenCalled();
  });

  it('opens each quick action', async () => {
    const handlers = { onCreateSchedule: vi.fn(), onOpenApprovals: vi.fn(), onOpenStaffs: vi.fn(), onOpenFleets: vi.fn() };
    renderPage(handlers);
    fireEvent.click(screen.getByRole('button', { name: /Schedule a trip/ }));
    fireEvent.click(screen.getByRole('button', { name: /Trip approvals/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Staffs/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Fleets/ }));
    Object.values(handlers).forEach((handler) => expect(handler).toHaveBeenCalledOnce());
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
  });

  it('opens Schedule from the deployment card', async () => {
    const onOpenSchedule = vi.fn();
    renderPage({ onOpenSchedule });
    fireEvent.click(screen.getByRole('button', { name: 'Open Schedule' }));
    expect(onOpenSchedule).toHaveBeenCalled();
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
  });
});
