import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import OperatorDashboardPage from '../OperatorDashboardPage';
import { getBusinessToday } from '../../../../utils/dates';

const mocks = vi.hoisted(() => ({
  getFleetLocations: vi.fn(),
  getRouteAdherence: vi.fn(),
  saveDispatchDecision: vi.fn(),
  getCalendarDays: vi.fn(),
  getDashboardOnTime: vi.fn(),
}));

vi.mock('../../../../api/StaffService/OperatorService', () => ({ default: mocks }));
vi.mock('../../CalendarSummaryStrip', () => ({ default: () => <div>calendar-summary</div> }));
vi.mock('../../DashboardCalendar', () => ({ default: () => <div>dashboard-calendar</div> }));
vi.mock('../../../Map/RouteMap', () => ({ default: () => <div data-testid="route-map" /> }));
vi.mock('../../../../services/routeMapService', () => ({ fetchRouteMapData: vi.fn().mockResolvedValue({ geometry: null, stops: [] }) }));

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
    mocks.getCalendarDays.mockResolvedValue({ data: { days: [] } });
    mocks.getDashboardOnTime.mockResolvedValue({ data: { grace_minutes: 5, today: { date: today, departed: 3, on_time: 2, percent: 67 }, last_week: { date: today, departed: 2, on_time: 1, percent: 50 } } });
  });

  // Batch 81 (user, 2026-11-19): the four figures of the designer's dashboard, from real data only.
  it('shows Active buses, On-time trips against last week, Trips in service and Total passengers', async () => {
    renderPage({ trips: [trip(1, { status: 'departed', total_occupancy: 12, passenger_count: { scanned_in: 9 } }), trip(2, { total_occupancy: 8 })] });
    const glance = screen.getByRole('region', { name: 'Today at a glance' });
    expect(within(glance).getByText('Active buses').closest('section > *')).toHaveTextContent('1 / 1');
    expect(glance).toHaveTextContent('100% in service');
    expect(await within(glance).findByText('67%')).toBeInTheDocument();
    expect(within(glance).getByLabelText('Up 17 pts vs last week')).toBeInTheDocument();
    expect(glance).toHaveTextContent('2 of 3 left within 5 min');
    expect(glance).toHaveTextContent('of 2 scheduled today');
    expect(within(glance).getByText('Total passengers').closest('section > *')).toHaveTextContent('20');
    expect(glance).toHaveTextContent('9 scanned in so far');
    expect(screen.queryByText(/revenue/i)).not.toBeInTheDocument();
  });

  it('says Not provided for On-time trips before any trip has left, with no change chip', async () => {
    mocks.getDashboardOnTime.mockResolvedValue({ data: { grace_minutes: 5, today: { date: today, departed: 0, on_time: 0, percent: null }, last_week: { date: today, departed: 2, on_time: 1, percent: 50 } } });
    renderPage({ trips: [trip(1)] });
    const glance = screen.getByRole('region', { name: 'Today at a glance' });
    await waitFor(() => expect(mocks.getDashboardOnTime).toHaveBeenCalled());
    expect(await within(glance).findByText('No trip has left yet today')).toBeInTheDocument();
    expect(within(glance).getByText('Not provided')).toBeInTheDocument();
    expect(screen.queryByTestId('op-delta')).toBeNull();
  });

  it("lists today's trips by route with its colour code and On time or Delayed, beside the live fleet map", async () => {
    renderPage({ trips: [trip(1), trip(2, { status: 'delayed' }), trip(3, { fleet_route: { fleet_id: 1, route_id: 20, fleet, route: { route_id: 20, route_name: 'Ecoland - Tagum', origin: 'Ecoland', destination: 'Tagum' } } })] });
    const list = screen.getByTestId('todays-trips');
    const rows = within(list).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('R1');
    expect(rows[0]).toHaveTextContent('Davao - Tagum');
    expect(rows[0]).toHaveTextContent('2 trips');
    expect(rows[0]).toHaveTextContent('Delayed');
    expect(rows[1]).toHaveTextContent('R2');
    expect(rows[1]).toHaveTextContent(/Ecoland →\s*to Tagum/); // the arrow is read as "to"
    expect(rows[1]).toHaveTextContent('On time');
    expect(screen.getByTestId('operator-fleet-map')).toBeInTheDocument();
    expect(screen.getByLabelText('Map legend')).toHaveTextContent('In service (0)');
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
  });

  // Batch 81: the old cards are gone; their suggestions now sit in Alerts & updates.
  it('keeps alerts and suggestions in Alerts & updates, and drops the old tables and trend lines', async () => {
    renderPage({ trips: [trip(7, { status: 'delayed' })] });
    expect(screen.getByText('Alerts & updates')).toBeInTheDocument();
    expect(screen.getAllByTestId('dashboard-suggestion').length).toBeGreaterThan(0);
    for (const title of ['Recommended actions', 'Route delay overview', 'Schedule at a glance', 'Suggested bus assignments', 'Tickets sold against capacity']) {
      expect(screen.queryByText(title)).not.toBeInTheDocument();
    }
    expect(screen.queryByTestId('op-sparkline')).toBeNull();
    expect(screen.getByText('dashboard-calendar')).toBeInTheDocument();
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
    expect(mocks.getRouteAdherence).not.toHaveBeenCalled();
  });

  it('opens each quick action, and the full map from the map card', async () => {
    const handlers = { onCreateSchedule: vi.fn(), onOpenApprovals: vi.fn(), onOpenStaffs: vi.fn() };
    const onOpenFleets = vi.fn();
    renderPage({ ...handlers, onOpenFleets });
    fireEvent.click(screen.getByRole('button', { name: /Schedule a trip/ }));
    fireEvent.click(screen.getByRole('button', { name: /Trip approvals/ }));
    fireEvent.click(screen.getByRole('button', { name: /Assign staff/ }));
    Object.values(handlers).forEach((handler) => expect(handler).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: /Manage fleet/ }));
    fireEvent.click(screen.getByRole('button', { name: /View full map/ }));
    expect(onOpenFleets).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
  });

  // Batch 60 (user, 2026-11-11): an alert opens where it can be dealt with.
  it('opens a delay alert on the bus\'s Track popup and a missing-crew alert on its trip', async () => {
    const onTrackTrip = vi.fn();
    const onOpenTrip = vi.fn();
    renderPage({ trips: [trip(7, { status: 'delayed' }), trip(8, { conductor: null })], onTrackTrip, onOpenTrip });
    fireEvent.click(screen.getByRole('button', { name: /Trip #7 is delayed/ }));
    expect(onTrackTrip).toHaveBeenCalledWith(7);
    fireEvent.click(screen.getByRole('button', { name: /Trip #8 still needs a chauffeur/ }));
    expect(onOpenTrip).toHaveBeenCalledWith(8);
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
  });

  it("opens Schedule from Today's trips", async () => {
    const onOpenSchedule = vi.fn();
    renderPage({ onOpenSchedule });
    fireEvent.click(screen.getByRole('button', { name: 'Open Schedule' }));
    expect(onOpenSchedule).toHaveBeenCalled();
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
  });

  // 2026-11-13 (user): Refresh shows that it is loading, then that it is done.
  it('spins while refreshing and then says Updated', async () => {
    let finish;
    const onRefresh = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
    renderPage({ onRefresh });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    const busy = screen.getByRole('button', { name: 'Refreshing…' });
    expect(busy).toBeDisabled();
    expect(onRefresh).toHaveBeenCalledTimes(1);
    fireEvent.click(busy);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    finish();
    expect(await screen.findByRole('button', { name: 'Updated' }, { timeout: 2000 })).toBeEnabled();
  });
});
