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
  setOperatorRouteStopExpress: vi.fn(),
}));

vi.mock('../../../../api/StaffService/OperatorService', () => ({ default: mocks }));
vi.mock('../../../Map/RouteMap', () => ({ default: ({ routeId }) => <div>route-map-{routeId}</div> }));
vi.mock('../../FareRulesPanel', () => ({ default: ({ tone }) => <div>fare-panel tone={tone}</div> }));

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
    const directory = screen.getByRole('table', { name: 'Stops' });
    expect(within(directory).queryByRole('columnheader', { name: 'Municipality' })).not.toBeInTheDocument();
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
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Overview', 'Stops', 'Schedule', 'Assigned fleets', 'Fare', 'Travel time']);
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

  it('does not expose custom drop-off controls and keeps travel time scoped to this route', async () => {
    renderPage();
    await openTagum();
    expect(screen.queryByRole('tab', { name: 'Drop-off rules' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /custom drop-off/i })).not.toBeInTheDocument();
    goToTab('Travel time');
    const table = screen.getByRole('table', { name: 'Expected travel time by stop' });
    expect(within(table).getByText('58 min')).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Expected time' })).toBeInTheDocument();
    expect(within(table).queryByRole('columnheader', { name: 'Regular' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('columnheader', { name: 'Express' })).not.toBeInTheDocument();
  });

  it('shows an empty state for a route with no stops', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Open route Davao-Mati' }));
    await screen.findByRole('tablist', { name: 'Route sections' });
    goToTab('Stops');
    expect(screen.getByText(/No stops on this route yet/)).toBeInTheDocument();
  });
});

describe('Stops directory search and paging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mocks).forEach((fn) => fn.mockResolvedValue({ data: { route_stops: [] } }));
  });

  const manyStops = Array.from({ length: 23 }, (_, i) => ({ stop_id: 100 + i, stop_name: `Plaza ${String(i + 1).padStart(2, '0')}`, municipality: i < 3 ? 'Tagum City' : 'Panabo City', latitude: 7 + i / 100, longitude: 125.6, stop_code: i === 4 ? 'CODE-X' : undefined }));
  const directory = () => screen.getByRole('table', { name: 'Stops' });

  it('shows ten stops at a time and moves between pages', () => {
    renderPage({ stops: manyStops });
    expect(within(directory()).getAllByRole('row')).toHaveLength(11); // header + 10
    expect(screen.getByText('Showing 1-10 of 23 stops')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Showing 11-20 of 23 stops')).toBeInTheDocument();
    expect(within(directory()).getByText('Plaza 11')).toBeInTheDocument();
    expect(within(directory()).queryByText('Plaza 01')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Showing 21-23 of 23 stops')).toBeInTheDocument();
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('searches by name, code or municipality and goes back to the first page', () => {
    renderPage({ stops: manyStops });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    fireEvent.change(screen.getByPlaceholderText(/Search stops/), { target: { value: 'plaza 07' } });
    expect(within(directory()).getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText('Showing 1-1 of 1 stops')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument(); // one page: no pager buttons

    fireEvent.change(screen.getByPlaceholderText(/Search stops/), { target: { value: 'code-x' } });
    expect(within(directory()).getByText('Plaza 05')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Search stops/), { target: { value: 'tagum' } });
    expect(screen.getByText('Showing 1-3 of 3 stops')).toBeInTheDocument();
  });

  it('says so when nothing matches, and keeps the "No stops yet" message for an empty directory', () => {
    const { unmount } = renderPage({ stops: manyStops });
    fireEvent.change(screen.getByPlaceholderText(/Search stops/), { target: { value: 'zzzz' } });
    expect(screen.getByText('No stop matches this search.')).toBeInTheDocument();
    unmount();

    renderPage({ stops: [] });
    expect(screen.getByText('No stops yet.')).toBeInTheDocument();
  });
});

describe('Route line redraw progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mocks).forEach((fn) => fn.mockResolvedValue({ data: { route_stops: [] } }));
  });
  afterEach(() => { vi.restoreAllMocks(); });

  const running = { ...routes[0], can_regenerate_geometry: true, geometry_regeneration_pending: true, redraw: { pending: true, stage: 'routing', stage_label: 'Drawing the route line', percent: 55, elapsed_s: 12, typical_s: 40, requested_at: '2026-10-21T08:00:00+08:00' } };

  it('shows a progress bar with the stage, the time so far and the usual time when a redraw is running', async () => {
    renderPage({ routes: [running, routes[1]] });
    await openTagum();

    const bar = screen.getByRole('progressbar', { name: 'Route line redraw progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '55');
    expect(screen.getByText(/Drawing the route line/)).toBeInTheDocument();
    expect(screen.getByText(/Running for 12 s/)).toHaveTextContent('usually about 40 s');
    expect(screen.getByRole('button', { name: 'Redrawing...' })).toBeDisabled();
  });

  it('tells the Operator when the redraw has finished, how long it took, and lets them dismiss it', async () => {
    mocks.getOperatorRoute.mockResolvedValue({ data: { ...running, geometry_regeneration_pending: false, redraw: { pending: false, percent: null, last: { ok: true, message: 'Geometry regenerated (120 points).', duration_s: 38 } } } });
    renderPage({ routes: [running, routes[1]] });
    await openTagum();

    const done = await screen.findByTestId('redraw-outcome', {}, { timeout: 6000 });
    expect(done).toHaveTextContent('Route line redrawn.');
    expect(done).toHaveTextContent('It took 38 s.');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    fireEvent.click(within(done).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByTestId('redraw-outcome')).not.toBeInTheDocument();
  }, 15000);

  it('says why when the redraw did not work and that the old line was kept', async () => {
    mocks.getOperatorRoute.mockResolvedValue({ data: { ...running, geometry_regeneration_pending: false, geometry_error: 'ORS_API_KEY is not configured.', redraw: { pending: false, last: { ok: false, message: 'ORS_API_KEY is not configured.', duration_s: 3 } } } });
    renderPage({ routes: [running, routes[1]] });
    await openTagum();

    const outcome = await screen.findByTestId('redraw-outcome', {}, { timeout: 6000 });
    expect(outcome).toHaveAttribute('role', 'alert');
    expect(outcome).toHaveTextContent('The route line was not redrawn.');
    expect(outcome).toHaveTextContent('ORS_API_KEY is not configured.');
    expect(outcome).toHaveTextContent('The previous line was kept.');
  }, 15000);
});
