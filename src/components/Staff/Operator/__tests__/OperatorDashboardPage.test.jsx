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

  it('lists today\'s trips with their crew and tickets sold', async () => {
    renderPage({ trips: [trip(1, { total_occupancy: 8 })] });
    const table = screen.getByRole('table', { name: "Today's trips" });
    expect(within(table).getByText(/Dina Driver/)).toBeInTheDocument();
    expect(within(table).getByText(/8 \/ 40 \(20%\)/)).toBeInTheDocument();
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
  });

  it('says plainly that nothing is automatic', async () => {
    renderPage();
    expect(screen.getByText(/The system recommends\. The operator decides\./)).toBeInTheDocument();
    expect(screen.queryByText(/predictive/i)).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
  });

  it('records the Operator\'s decision on the trip and refreshes', async () => {
    const onRefresh = vi.fn();
    renderPage({ trips: [trip(7, { status: 'delayed' })], onRefresh });
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge advice' }));
    await waitFor(() => expect(mocks.saveDispatchDecision).toHaveBeenCalledWith(7, expect.objectContaining({ decision: 'accept', route: 'Davao - Tagum' })));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });

  it('can keep the current route', async () => {
    renderPage({ trips: [trip(7, { status: 'delayed' })] });
    fireEvent.click(screen.getByRole('button', { name: 'Keep current route' }));
    await waitFor(() => expect(mocks.saveDispatchDecision).toHaveBeenCalledWith(7, expect.objectContaining({ decision: 'keep' })));
  });

  it('shows a recorded decision instead of the buttons', async () => {
    renderPage({ trips: [trip(7, { status: 'delayed', dispatch_decision: 'keep', dispatch_decided_at: new Date().toISOString() })] });
    expect(screen.getAllByText(/Kept current route/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Acknowledge advice' })).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
  });

  it('shows the save error when the decision fails', async () => {
    mocks.saveDispatchDecision.mockRejectedValue(new Error('Not allowed'));
    renderPage({ trips: [trip(7, { status: 'delayed' })] });
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge advice' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Not allowed');
  });

  it('asks the report for each fleet and says when there is no GPS history', async () => {
    renderPage();
    expect(await screen.findByText(/No GPS history for the last 7 days/)).toBeInTheDocument();
    expect(mocks.getRouteAdherence).toHaveBeenCalledWith(1, expect.objectContaining({ start_date: expect.any(String), end_date: today }));
  });

  it('says the report is unavailable when every fleet fails', async () => {
    mocks.getRouteAdherence.mockRejectedValue(new Error('Server Error'));
    renderPage();
    expect(await screen.findByText(/could not be loaded right now/)).toBeInTheDocument();
  });

  it('names a fleet whose report failed instead of calling it "no GPS history"', async () => {
    mocks.getRouteAdherence.mockImplementation(async (id) => {
      if (id === 2) throw new Error('Server Error');
      return { data: { summary: { trips_with_gps_data: 0, deviated_trips: 0, adherence_rate_pct: null } } };
    });
    renderPage({ fleets: [fleet, { ...fleet, fleet_id: 2, plate_number: 'PLT-2' }] });
    expect(await screen.findByText(/could not be loaded for PLT-2/)).toBeInTheDocument();
    expect(screen.queryByText(/No GPS history for the last 7 days/)).not.toBeInTheDocument();
  });

  it('shows adherence when the report has GPS data', async () => {
    mocks.getRouteAdherence.mockResolvedValue({ data: { summary: { trips_with_gps_data: 4, deviated_trips: 1, adherence_rate_pct: 75 } } });
    renderPage();
    expect(await screen.findByText('75% overall')).toBeInTheDocument();
  });

  it('opens Schedule from the deployment card', async () => {
    const onOpenSchedule = vi.fn();
    renderPage({ onOpenSchedule });
    fireEvent.click(screen.getByRole('button', { name: 'Open Schedule' }));
    expect(onOpenSchedule).toHaveBeenCalled();
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
  });
});
