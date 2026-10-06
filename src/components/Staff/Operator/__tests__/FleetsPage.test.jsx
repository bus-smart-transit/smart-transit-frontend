import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import FleetsPage from '../FleetsPage';
import { getBusinessToday } from '../../../../utils/dates';

const mocks = vi.hoisted(() => ({
  getFleetLocations: vi.fn(),
  createFleet: vi.fn(),
  assignRouteToFleet: vi.fn(),
  saveDispatchDecision: vi.fn(),
}));

vi.mock('../../../../api/StaffService/OperatorService', () => ({ default: mocks }));
vi.mock('../../../../api/hooks/Staff/useFareOptions', () => ({ default: () => ({ vehicle_classes: [{ key: 'aircon', label: 'Aircon' }] }) }));
vi.mock('../../FareRulesPanel', () => ({ default: () => <div>fare-rules-panel</div> }));
vi.mock('../FleetTrackingMap', () => ({ default: ({ trip }) => <div>map-for-trip-{trip.trip_id}</div> }));

const today = getBusinessToday();
const fleet = (id, extra = {}) => ({ fleet_id: id, plate_number: `PLT-${id}`, body_no: `B${id}`, capacity: 40, seated_capacity: 30, standing_capacity: 10, status: 'active', fleet_type: 'public', vehicle_class: 'aircon', fleet_routes: [{ route: { route_name: 'Davao - Tagum' } }], ...extra });
const trip = (id, fleetId, status, extra = {}) => ({
  trip_id: id, trip_date: today, departure_time: '08:00:00', status, total_occupancy: 10,
  driver: { user: { name: 'Dina Driver' } }, conductor: { user: { name: 'Carl Conductor' } },
  fleet_route: { fleet_id: fleetId, route_id: 10, fleet: fleet(fleetId), route: { route_id: 10, route_name: 'Davao - Tagum' } },
  ...extra,
});
const fresh = (fleetId, extra = {}) => ({ fleet_id: fleetId, trip_id: null, latitude: 7.1, longitude: 125.6, accuracy_m: 5, recorded_at: new Date().toISOString(), ...extra });

const fleets = [fleet(1), fleet(2), fleet(3), fleet(4)];
const trips = [trip(1, 1, 'departed'), trip(2, 2, 'scheduled'), trip(4, 4, 'in-progress')];
const routes = [{ route_id: 10, route_name: 'Davao - Tagum' }];

const renderPage = (props = {}) => render(<FleetsPage fleets={fleets} routes={routes} trips={trips} onRefresh={vi.fn()} {...props} />);
const rowFor = (plate) => screen.getByText(plate).closest('tr');

describe('FleetsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFleetLocations.mockResolvedValue({ data: [fresh(1)] });
    mocks.createFleet.mockResolvedValue({});
    mocks.assignRouteToFleet.mockResolvedValue({});
    mocks.saveDispatchDecision.mockResolvedValue({});
  });

  it('derives each fleet\'s status from its trips and GPS', async () => {
    renderPage();
    await waitFor(() => expect(within(rowFor('PLT-1')).getByText('On route')).toBeInTheDocument());
    expect(within(rowFor('PLT-2')).getByText('Active')).toBeInTheDocument();
    expect(within(rowFor('PLT-3')).getByText('Idle')).toBeInTheDocument();
    expect(within(rowFor('PLT-4')).getByText('Offline')).toBeInTheDocument();
  });

  it('has no maintenance state and no progress bar', async () => {
    renderPage();
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
    expect(screen.queryByText(/maintenance/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('enables Track only for a fleet with a trip under way', async () => {
    renderPage();
    await waitFor(() => expect(within(rowFor('PLT-1')).getByText('On route')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Track fleet PLT-1' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Track fleet PLT-2' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Track fleet PLT-3' })).toBeDisabled();
  });

  it('opens the Track Fleet modal with the map, the trip and the last update', async () => {
    renderPage();
    await waitFor(() => expect(within(rowFor('PLT-1')).getByText('On route')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Track fleet PLT-1' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('map-for-trip-1')).toBeInTheDocument();
    expect(within(dialog).getByText(/Dina Driver/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Last update/)).toBeInTheDocument();
    expect(within(dialog).getByText(/10 of 40/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Open in Google Maps' })).toBeEnabled();
  });

  it('shows the stale state instead of calling an old position live', async () => {
    mocks.getFleetLocations.mockResolvedValue({ data: [fresh(1, { recorded_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() })] });
    renderPage();
    await waitFor(() => expect(within(rowFor('PLT-1')).getByText('Offline')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Track fleet PLT-1' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Last seen 20m ago/)).toBeInTheDocument();
    expect(within(dialog).queryByText('Live')).not.toBeInTheDocument();
  });

  it('records a decision from the Track Fleet modal when advice exists', async () => {
    const delayed = [trip(1, 1, 'departed'), trip(7, 4, 'delayed', { fleet_route: { fleet_id: 4, route_id: 10, fleet: fleet(4), route: { route_id: 10, route_name: 'Davao - Tagum' } } })];
    renderPage({ trips: delayed });
    await waitFor(() => expect(within(rowFor('PLT-1')).getByText('On route')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Track fleet PLT-1' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Keep current route' }));
    await waitFor(() => expect(mocks.saveDispatchDecision).toHaveBeenCalledWith(7, expect.objectContaining({ decision: 'keep', route: 'Davao - Tagum' })));
  });

  it('filters the list by status', async () => {
    renderPage();
    await waitFor(() => expect(within(rowFor('PLT-1')).getByText('On route')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Idle' }));
    expect(screen.getByText('PLT-3')).toBeInTheDocument();
    expect(screen.queryByText('PLT-1')).not.toBeInTheDocument();
  });

  it('keeps the fare rules panel', async () => {
    renderPage();
    expect(screen.getByText('fare-rules-panel')).toBeInTheDocument();
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
  });

  it('adds a fleet from a modal with the same fields, then closes it', async () => {
    const onRefresh = vi.fn();
    renderPage({ onRefresh });
    fireEvent.click(screen.getByRole('button', { name: /Add fleet/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Plate number'), { target: { value: 'NEW-999' } });
    fireEvent.change(within(dialog).getByLabelText('Seated capacity'), { target: { value: '30' } });
    fireEvent.change(within(dialog).getByLabelText('Standing capacity'), { target: { value: '10' } });
    fireEvent.change(within(dialog).getByLabelText('Vehicle class'), { target: { value: 'aircon' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create fleet' }));
    await waitFor(() => expect(mocks.createFleet).toHaveBeenCalledWith(expect.objectContaining({ plate_number: 'NEW-999', seated_capacity: 30, standing_capacity: 10, vehicle_class: 'aircon', fleet_type: 'public' })));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Fleet created successfully.')).toBeInTheDocument();
    expect(onRefresh).toHaveBeenCalled();
  });

  it('adds the route with its operating times when one is chosen', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Add fleet/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Plate number'), { target: { value: 'NEW-1' } });
    fireEvent.change(within(dialog).getByLabelText('Seated capacity'), { target: { value: '30' } });
    fireEvent.change(within(dialog).getByLabelText('Standing capacity'), { target: { value: '0' } });
    fireEvent.change(within(dialog).getByLabelText('Route (optional)'), { target: { value: '10' } });
    expect(within(dialog).getByLabelText('Operating start')).toHaveValue('06:00');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create fleet' }));
    await waitFor(() => expect(mocks.createFleet).toHaveBeenCalledWith(expect.objectContaining({ routes: [{ route_id: 10, start_time: '06:00', end_time: '22:00' }] })));
  });

  it('keeps the modal open and shows the error when creating a fleet fails', async () => {
    mocks.createFleet.mockRejectedValue(new Error('Failed to create fleet: plate already used'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Add fleet/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Plate number'), { target: { value: 'DUP-1' } });
    fireEvent.change(within(dialog).getByLabelText('Seated capacity'), { target: { value: '30' } });
    fireEvent.change(within(dialog).getByLabelText('Standing capacity'), { target: { value: '0' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create fleet' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('plate already used');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('assigns a route to a fleet from a modal', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Assign route' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Fleet'), { target: { value: '3' } });
    fireEvent.change(within(dialog).getByLabelText('Route'), { target: { value: '10' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Assign route' }));
    await waitFor(() => expect(mocks.assignRouteToFleet).toHaveBeenCalledWith(3, { route_id: 10, start_time: '06:00', end_time: '22:00' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('has exactly one header action', async () => {
    renderPage();
    const header = screen.getByRole('heading', { name: 'Fleets' }).closest('header');
    expect(within(header).getAllByRole('button')).toHaveLength(1);
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
  });

  it('says how to start when there are no fleets', async () => {
    renderPage({ fleets: [], trips: [] });
    expect(screen.getByText(/No fleets yet/)).toBeInTheDocument();
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
  });
});
