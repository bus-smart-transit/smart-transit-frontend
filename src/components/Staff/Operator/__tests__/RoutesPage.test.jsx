import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import RoutesPage from '../RoutesPage';
import { getBusinessToday } from '../../../../utils/dates';

const mocks = vi.hoisted(() => ({
  getOperatorRoute: vi.fn(),
  regenerateRouteGeometry: vi.fn(),
  createOperatorRoute: vi.fn(),
  createOperatorStop: vi.fn(),
  updateOperatorStop: vi.fn(),
  deleteOperatorStop: vi.fn(),
  addOperatorStopToRoute: vi.fn(),
  removeOperatorStopFromRoute: vi.fn(),
  setOperatorRouteCustomDropoff: vi.fn(),
  setOperatorRouteStopExpress: vi.fn(),
}));

vi.mock('../../../../api/StaffService/OperatorService', () => ({ default: mocks }));
vi.mock('../../../Map/RouteMap', () => ({ default: ({ routeId }) => <div>route-map-{routeId}</div> }));
vi.mock('../../FareRulesPanel', () => ({ default: ({ tone }) => <div>fare-panel tone={tone}</div> }));
vi.mock('../../DropoffRulesPanel', () => ({ default: ({ routes }) => <div>dropoff-panel routes={routes.length}</div> }));
vi.mock('../../DurationFactorsPanel', () => ({ default: ({ routes }) => <div>duration-panel routes={routes.length}</div> }));

const today = getBusinessToday();
const rs = (id, order, municipality, km, offset, extra = {}) => ({ id: id * 10, stop_id: id, stop_order: order, distance_from_origin_km: km, scheduled_offset_min: offset, stop_type: 'stop', served_by_express: false, stop: { stop_id: id, stop_name: `Stop ${id}`, municipality }, ...extra });

const routes = [
  { route_id: 4, route_name: 'Davao - Tagum', origin: 'Davao', destination: 'Tagum', allow_custom_dropoff: false, route_stops: [rs(1, 1, 'Davao City', '0.00', 0), rs(2, 2, 'Carmen', '6.50', 18), rs(3, 3, 'Tagum City', '22.00', 58)] },
  { route_id: 5, route_name: 'Davao-Mati', origin: 'Davao', destination: 'Mati', route_stops: [] },
];
const stops = [
  { stop_id: 1, stop_name: 'Stop 1', municipality: 'Davao City', latitude: 7.1, longitude: 125.6, stop_code: 'S1' },
  { stop_id: 2, stop_name: 'Stop 2', municipality: 'Carmen', latitude: 7.2, longitude: 125.7 },
  { stop_id: 3, stop_name: 'Stop 3', municipality: 'Tagum City', latitude: 7.4, longitude: 125.8 },
  { stop_id: 9, stop_name: 'Spare stop', municipality: 'Panabo City', latitude: 7.3, longitude: 125.7 },
];
const fleets = [{ fleet_id: 1, plate_number: 'PLT-1', status: 'active', fleet_type: 'public', capacity: 40, fleet_routes: [{ fleet_route_id: 1, route_id: 4, status: 'active', start_time: '05:00:00', end_time: '21:00:00' }] }];
const trips = [
  { trip_id: 1, trip_date: today, departure_time: '09:00:00', status: 'scheduled', total_occupancy: 5, fleet_route: { route: { route_id: 4 }, fleet: { plate_number: 'PLT-1' } } },
  { trip_id: 2, trip_date: '2026-01-01', departure_time: '09:00:00', status: 'completed', total_occupancy: 20, fleet_route: { route: { route_id: 4 }, fleet: { plate_number: 'PLT-1' } } },
];

const renderPage = (props = {}) => render(
  <RoutesPage routes={routes} stops={stops} trips={trips} fleets={fleets} onRefresh={vi.fn()} onOpenSchedule={vi.fn()} onOpenFleets={vi.fn()} {...props} />,
);
const openTagum = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Open route Davao - Tagum' }));
  await screen.findByRole('tablist', { name: 'Route sections' });
};
const goToTab = (name) => fireEvent.click(screen.getByRole('tab', { name }));

describe('RoutesPage list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mocks).forEach((fn) => fn.mockResolvedValue({ data: { route_stops: [] } }));
  });

  it('lists each route with municipalities, stops, distance, travel time, fleets and status', () => {
    renderPage();
    const row = screen.getByText('Davao - Tagum').closest('tr');
    expect(within(row).getByText('Davao City, Carmen, Tagum City')).toBeInTheDocument();
    expect(within(row).getByText('22 km')).toBeInTheDocument();
    expect(within(row).getByText('58 min')).toBeInTheDocument();
    expect(within(row).getByText('PLT-1')).toBeInTheDocument();
    expect(within(row).getByText('Active')).toBeInTheDocument();
    const empty = screen.getByText('Davao-Mati').closest('tr');
    expect(within(empty).getByText('No active fleet')).toBeInTheDocument();
  });

  it('never claims route adherence or a route health score', () => {
    renderPage();
    expect(screen.queryByText(/adherence/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/health/i)).not.toBeInTheDocument();
  });

  it('searches the list and filters by municipality', () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/Search by name/), { target: { value: 'mati' } });
    expect(screen.queryByText('Davao - Tagum')).not.toBeInTheDocument();
    expect(screen.getByText('Davao-Mati')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Search by name/), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Filter by municipality'), { target: { value: 'Carmen' } });
    expect(screen.getByText('Davao - Tagum')).toBeInTheDocument();
    expect(screen.queryByText('Davao-Mati')).not.toBeInTheDocument();
  });

  it('says how to start when there are no routes', () => {
    renderPage({ routes: [], stops: [] });
    expect(screen.getByText(/No routes yet/)).toBeInTheDocument();
  });

  it('has exactly one header action', () => {
    renderPage();
    const header = screen.getByRole('heading', { name: 'Routes' }).closest('header');
    expect(within(header).getAllByRole('button')).toHaveLength(1);
  });

  it('adds a route from a modal with the same fields', async () => {
    const onRefresh = vi.fn();
    renderPage({ onRefresh });
    fireEvent.click(screen.getByRole('button', { name: /Add route/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Route name'), { target: { value: 'Davao - Digos' } });
    fireEvent.change(within(dialog).getByLabelText('Origin'), { target: { value: 'Davao' } });
    fireEvent.change(within(dialog).getByLabelText('Destination'), { target: { value: 'Digos' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create route' }));
    await waitFor(() => expect(mocks.createOperatorRoute).toHaveBeenCalledWith({ route_name: 'Davao - Digos', origin: 'Davao', destination: 'Digos' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Route created successfully.')).toBeInTheDocument();
    expect(onRefresh).toHaveBeenCalled();
  });

  it('keeps the route modal open and shows the error when it fails', async () => {
    mocks.createOperatorRoute.mockRejectedValue(new Error('Failed to create route: name taken'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Add route/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Route name'), { target: { value: 'X' } });
    fireEvent.change(within(dialog).getByLabelText('Origin'), { target: { value: 'A' } });
    fireEvent.change(within(dialog).getByLabelText('Destination'), { target: { value: 'B' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create route' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('name taken');
  });

  it('adds, edits and deletes stops from the directory', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Add stop/ }));
    let dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Stop name'), { target: { value: 'New stop' } });
    fireEvent.change(within(dialog).getByLabelText('Location label'), { target: { value: 'Near the plaza' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create stop' }));
    await waitFor(() => expect(mocks.createOperatorStop).toHaveBeenCalledWith({ stop_name: 'New stop', location: 'Near the plaza' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Edit stop Stop 2' }));
    dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Stop name')).toHaveValue('Stop 2');
    fireEvent.change(within(dialog).getByLabelText('Stop name'), { target: { value: 'Stop two' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Update stop' }));
    await waitFor(() => expect(mocks.updateOperatorStop).toHaveBeenCalledWith(2, expect.objectContaining({ stop_name: 'Stop two' })));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Delete stop Spare stop' }));
    await waitFor(() => expect(mocks.deleteOperatorStop).toHaveBeenCalledWith(9));
    window.confirm.mockRestore();
  });
});

describe('Route detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mocks).forEach((fn) => fn.mockResolvedValue({ data: { route_stops: [] } }));
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('opens a route, shows the seven sections, and goes back to the list', async () => {
    renderPage();
    await openTagum();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Overview', 'Stops', 'Schedule', 'Assigned fleets', 'Fare', 'Drop-off rules', 'Travel time']);
    expect(screen.getByRole('heading', { name: 'Davao - Tagum' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /All routes/ }));
    expect(screen.getByRole('heading', { name: 'Routes' })).toBeInTheDocument();
  });

  it('overview shows the summary, the map and the route activity with a completion rate', async () => {
    renderPage();
    await openTagum();
    const summary = screen.getByRole('region', { name: 'Route summary' });
    expect(within(summary).getByText('22 km')).toBeInTheDocument();
    expect(within(summary).getByText('58 min')).toBeInTheDocument();
    expect(screen.getByText('route-map-4')).toBeInTheDocument();
    expect(screen.getByText('Completion rate')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.queryByText(/adherence/i)).not.toBeInTheDocument();
  });

  it('shows redraw status and asks before queuing for a route the Operator may manage', async () => {
    const onRefresh = vi.fn();
    const route = { ...routes[0], can_regenerate_geometry: true, geometry_stale: true, geometry_generated_at: '2026-10-16 13:44:17' };
    renderPage({ routes: [route, routes[1]], onRefresh });
    await openTagum();

    expect(screen.getByText('Needs redraw')).toBeInTheDocument();
    expect(screen.getByText(/Last drawn:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Redraw route line' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('uses routing-provider quota');
    expect(mocks.regenerateRouteGeometry).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Redraw route line' }));
    await waitFor(() => expect(mocks.regenerateRouteGeometry).toHaveBeenCalledWith(4));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('does not offer redraw for a route the server marks outside the Operator scope', async () => {
    const route = { ...routes[0], can_regenerate_geometry: false, geometry_stale: true };
    renderPage({ routes: [route, routes[1]] });
    await openTagum();

    expect(screen.getByText('Needs redraw')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Redraw route line' })).not.toBeInTheDocument();
  });

  it('toggles custom drop-off from the overview', async () => {
    renderPage();
    await openTagum();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow custom drop-off pins on Davao - Tagum' }));
    await waitFor(() => expect(mocks.setOperatorRouteCustomDropoff).toHaveBeenCalledWith(4, true));
  });

  it('stops tab lists the stops in order with no reordering control', async () => {
    renderPage();
    await openTagum();
    goToTab('Stops');
    const rows = within(screen.getByRole('table', { name: 'Stops on this route' })).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell')[1].textContent)).toEqual(['Stop 1', 'Stop 2', 'Stop 3']);
    expect(screen.queryByText(/drag|move up|move down|reorder/i)).not.toBeInTheDocument();
  });

  it('toggles express and removes a stop (after confirming)', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    await openTagum();
    goToTab('Stops');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Express trips stop at Stop 2' }));
    await waitFor(() => expect(mocks.setOperatorRouteStopExpress).toHaveBeenCalledWith(4, 20, true));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Stop 3 from route' }));
    await waitFor(() => expect(mocks.removeOperatorStopFromRoute).toHaveBeenCalledWith(4, 30));
  });

  it('assigns a stop with the next order and only offers stops not yet on the route', async () => {
    renderPage();
    await openTagum();
    goToTab('Stops');
    fireEvent.click(screen.getByRole('button', { name: 'Assign stop' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Stop order')).toHaveValue(4);
    const options = within(dialog).getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['Select stop', 'Spare stop (Panabo City)']);
    fireEvent.change(within(dialog).getByLabelText('Stop'), { target: { value: '9' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Assign stop' }));
    await waitFor(() => expect(mocks.addOperatorStopToRoute).toHaveBeenCalledWith(4, { stop_id: 9, stop_order: 4 }));
  });

  it('schedule tab shows service windows and the trips still to run, and opens Schedule', async () => {
    const onOpenSchedule = vi.fn();
    renderPage({ onOpenSchedule });
    await openTagum();
    goToTab('Schedule');
    expect(screen.getByText('05:00 - 21:00')).toBeInTheDocument();
    const upcoming = screen.getByRole('table', { name: 'Upcoming trips on this route' });
    expect(within(upcoming).getAllByRole('row')).toHaveLength(2);
    expect(within(upcoming).getByText('09:00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Schedule' }));
    expect(onOpenSchedule).toHaveBeenCalled();
  });

  it('assigned fleets tab lists the fleets and opens Fleets', async () => {
    const onOpenFleets = vi.fn();
    renderPage({ onOpenFleets });
    await openTagum();
    goToTab('Assigned fleets');
    expect(within(screen.getByRole('table', { name: 'Fleets assigned to this route' })).getByText('PLT-1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Fleets' }));
    expect(onOpenFleets).toHaveBeenCalled();
  });

  it('fare tab shows the fare rules, with a note on how rules relate to routes', async () => {
    renderPage();
    await openTagum();
    goToTab('Fare');
    expect(screen.getByText(/fare-panel tone=light/)).toBeInTheDocument();
    expect(screen.getByText(/A rule either covers every route or one route/)).toBeInTheDocument();
  });

  it('drop-off tab and travel time tab use this route only', async () => {
    renderPage();
    await openTagum();
    goToTab('Drop-off rules');
    expect(screen.getByText('dropoff-panel routes=1')).toBeInTheDocument();
    goToTab('Travel time');
    expect(screen.getByText('duration-panel routes=1')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Scheduled travel time by stop' });
    expect(within(table).getByText('58 min')).toBeInTheDocument();
  });

  it('shows an empty state for a route with no stops', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Open route Davao-Mati' }));
    await screen.findByRole('tablist', { name: 'Route sections' });
    goToTab('Stops');
    expect(screen.getByText(/No stops on this route yet/)).toBeInTheDocument();
  });
});
