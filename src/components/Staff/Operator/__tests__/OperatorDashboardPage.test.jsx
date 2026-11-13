import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import OperatorDashboardPage from '../OperatorDashboardPage';
import { getBusinessToday } from '../../../../utils/dates';

const mocks = vi.hoisted(() => ({
  getFleetLocations: vi.fn(),
  getRouteAdherence: vi.fn(),
  saveDispatchDecision: vi.fn(),
  getCalendarDays: vi.fn(),
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
    mocks.getCalendarDays.mockResolvedValue({ data: { days: [] } });
  });

  // 2026-11-13: trend lines on the stat cards, from real data only.
  it('shows trips per day for the last 7 days and the change against yesterday on Trips today', async () => {
    const day = (offset) => { const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
    mocks.getCalendarDays.mockResolvedValue({ data: { days: [{ date: day(-1), trips: 10 }, { date: today, trips: 12 }] } });
    renderPage({ trips: [trip(1), trip(2, { departure_time: '10:00:00' })] });
    await waitFor(() => expect(mocks.getCalendarDays).toHaveBeenCalledWith({ from: day(-6), to: today }));
    expect(await screen.findByLabelText('Up 20% vs yesterday')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^Trips per day, last 7 days/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Tickets sold today by departure hour. 08:00 trips: 8 sold, 10:00 trips: 8 sold' })).toBeInTheDocument();
  });

  it('shows no change chip when yesterday had no trips, and keeps the card when the calendar fails', async () => {
    mocks.getCalendarDays.mockRejectedValue(new Error('offline'));
    renderPage({ trips: [trip(1)] });
    await waitFor(() => expect(mocks.getCalendarDays).toHaveBeenCalled());
    expect(screen.queryByTestId('op-delta')).toBeNull();
    expect(within(screen.getByRole('region', { name: 'Today at a glance' })).getByText('Trips today')).toBeInTheDocument();
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

  it('opens Schedule from the deployment card', async () => {
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
