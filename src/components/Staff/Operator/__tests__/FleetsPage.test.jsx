import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import FleetsPage from '../FleetsPage';
import { getBusinessToday } from '../../../../utils/dates';

const mocks = vi.hoisted(() => ({
  getFleetLocations: vi.fn(),
  createFleet: vi.fn(),
  assignRouteToFleet: vi.fn(),
  saveDispatchDecision: vi.fn(),
  updateFleet: vi.fn(),
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
// Batch 53 item 7: one card per bus (was a table row).
const rowFor = (plate) => screen.getByText(plate).closest('[data-testid="fleet-card"]');

describe('FleetsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFleetLocations.mockResolvedValue({ data: [fresh(1)] });
    mocks.createFleet.mockResolvedValue({});
    mocks.assignRouteToFleet.mockResolvedValue({});
    mocks.saveDispatchDecision.mockResolvedValue({});
  });

  // Batch 60 item 4: a running bus is Active (On route and Offline were folded in); its GPS chip still says the GPS state.
  it('derives each fleet\'s status from its trips, with the GPS state on the card', async () => {
    renderPage();
    await waitFor(() => expect(within(rowFor('PLT-1')).getByText('Active')).toBeInTheDocument());
    expect(within(rowFor('PLT-2')).getByText('Active')).toBeInTheDocument();
    expect(within(rowFor('PLT-3')).getByText('Idle')).toBeInTheDocument();
    expect(within(rowFor('PLT-4')).getByText('Active')).toBeInTheDocument();
    expect(within(rowFor('PLT-4')).getByText('No GPS')).toBeInTheDocument();
    const summary = screen.getByRole('region', { name: 'Fleet summary' });
    expect(within(summary).queryByText('On route')).toBeNull();
    expect(within(summary).queryByText('Offline')).toBeNull();
  });

  it('has no maintenance state and no progress bar', async () => {
    renderPage();
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
    expect(screen.queryByText(/maintenance/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('enables Track only for a fleet with a trip under way', async () => {
    renderPage();
    await waitFor(() => expect(within(rowFor('PLT-1')).getByText('Active')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Track fleet PLT-1' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Track fleet PLT-2' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Track fleet PLT-3' })).toBeDisabled();
  });

  it('opens the Track Fleet modal with the map, the trip and the last update', async () => {
    renderPage();
    await waitFor(() => expect(within(rowFor('PLT-1')).getByText('Active')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Track fleet PLT-1' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('map-for-trip-1')).toBeInTheDocument();
    expect(within(dialog).getByText(/Dina Driver/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Last update/)).toBeInTheDocument();
    expect(within(dialog).getByText(/10 of 40/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Open in Google Maps' })).toBeEnabled();
  });

  it('shows how many are on board now next to the tickets sold (§4.7)', async () => {
    renderPage({ trips: [trip(1, 1, 'departed', { onboard_count: 7 })] });
    await waitFor(() => expect(within(rowFor('PLT-1')).getByText('Active')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Track fleet PLT-1' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByTestId('onboard-now')).toHaveTextContent('7 of 40');
    expect(within(dialog).getByText(/10 of 40/)).toBeInTheDocument(); // tickets sold is still shown
  });

  it('says "Not provided" when the trip carries no on-board count', async () => {
    renderPage();
    await waitFor(() => expect(within(rowFor('PLT-1')).getByText('Active')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Track fleet PLT-1' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByTestId('onboard-now')).toHaveTextContent('Not provided');
  });

  it('shows the stale state instead of calling an old position live', async () => {
    mocks.getFleetLocations.mockResolvedValue({ data: [fresh(1, { recorded_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() })] });
    renderPage();
    await waitFor(() => expect(within(rowFor('PLT-1')).getByText('Active')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Track fleet PLT-1' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Last seen 20m ago/)).toBeInTheDocument();
    expect(within(dialog).queryByText('Live')).not.toBeInTheDocument();
  });

  // Batch 60 (user, 2026-11-11): the late bus's own Track popup holds its advice (it used to show in another bus's popup
  // on the same route, and a late bus could not be tracked at all).
  it('records a decision from the late bus\'s own Track popup', async () => {
    const delayed = [trip(1, 1, 'departed'), trip(7, 4, 'delayed', { fleet_route: { fleet_id: 4, route_id: 10, fleet: fleet(4), route: { route_id: 10, route_name: 'Davao - Tagum' } } })];
    renderPage({ trips: delayed });
    await waitFor(() => expect(within(rowFor('PLT-1')).getByText('Active')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Track fleet PLT-1' }));
    let dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: 'Keep current route' })).not.toBeInTheDocument();
    expect(within(dialog).getByText('No reroute advice for this trip right now.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));

    fireEvent.click(screen.getByRole('button', { name: 'Track fleet PLT-4' }));
    dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByTestId('track-not-running')).toHaveTextContent('Trip #7 has not left yet');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep current route' }));
    await waitFor(() => expect(mocks.saveDispatchDecision).toHaveBeenCalledWith(7, expect.objectContaining({ decision: 'keep', route: 'Davao - Tagum' })));
  });

  it('opens the Track popup an alert asks for, by trip or by bus, and says so when the trip is not loaded', async () => {
    const onTrackHandled = vi.fn();
    const { rerender } = renderPage({ trackRequest: { tripId: 4 }, onTrackHandled });
    let dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Track fleet - PLT-4');
    expect(onTrackHandled).toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    rerender(<FleetsPage fleets={fleets} routes={routes} trips={trips} onRefresh={vi.fn()} trackRequest={{ tripId: 99, fleetId: 1 }} onTrackHandled={onTrackHandled} />);
    dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Track fleet - PLT-1');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    rerender(<FleetsPage fleets={fleets} routes={routes} trips={trips} onRefresh={vi.fn()} trackRequest={{ tripId: 555 }} onTrackHandled={onTrackHandled} />);
    expect(await screen.findByText('Trip #555 is not in the loaded list. Choose Refresh and try again.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('filters the list by status', async () => {
    renderPage();
    await waitFor(() => expect(within(rowFor('PLT-1')).getByText('Active')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /^Idle \(\d+\)$/ }));
    expect(screen.getByText('PLT-3')).toBeInTheDocument();
    expect(screen.queryByText('PLT-1')).not.toBeInTheDocument();
  });

  // Batch 54 (production test): a bus switched off was in All but in no chip, so the counts did not add up.
  it('shows an Inactive chip only when a bus is switched off, so the chips add up to All', async () => {
    const { unmount } = renderPage();
    await waitFor(() => expect(within(rowFor('PLT-1')).getByText('Active')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /^Inactive \(\d+\)$/ })).not.toBeInTheDocument();
    unmount();

    renderPage({ fleets: [...fleets, fleet(5, { status: 'inactive', plate_number: 'PLT-5' })] });
    fireEvent.click(await screen.findByRole('button', { name: 'Inactive (1)' }));
    expect(screen.getByText('PLT-5')).toBeInTheDocument();
    expect(screen.queryByText('PLT-1')).not.toBeInTheDocument();
    const count = (name) => Number(screen.getByRole('button', { name: new RegExp(`^${name} \\((\\d+)\\)$`) }).textContent.match(/\((\d+)\)/)[1]);
    expect(['Active', 'Idle', 'Inactive'].reduce((sum, name) => sum + count(name), 0)).toBe(count('All'));
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

  it('edits a bus and shows the server\'s answer when places would drop below what is sold (2026-11-06)', async () => {
    mocks.updateFleet
      .mockRejectedValueOnce(new Error('32 seats are already sold on a trip of this bus that has not finished. Choose at least 32.'))
      .mockResolvedValueOnce({ data: {} });
    const onRefresh = vi.fn();
    renderPage({ onRefresh });
    fireEvent.click(screen.getByRole('button', { name: 'Edit fleet PLT-1' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Plate number')).toHaveValue('PLT-1');

    fireEvent.change(within(dialog).getByLabelText('Seated capacity'), { target: { value: '20' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Choose at least 32.');

    fireEvent.change(within(dialog).getByLabelText('Seated capacity'), { target: { value: '35' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(mocks.updateFleet).toHaveBeenLastCalledWith(1, expect.objectContaining({ plate_number: 'PLT-1', seated_capacity: 35, standing_capacity: 10 })));
    expect(await screen.findByText('Fleet PLT-1 updated.')).toBeInTheDocument();
    expect(onRefresh).toHaveBeenCalled();
  });

  it('shows the company as the bus company name, read only (Batch 46 step 2)', async () => {
    renderPage({ companyName: 'Davao Metro Shuttle' });
    fireEvent.click(screen.getByRole('button', { name: /Add fleet/ }));
    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByTestId('fleet-company-name')).toHaveTextContent('Davao Metro Shuttle');
    expect(within(dialog).queryByRole('textbox', { name: /Bus company name/ })).toBeNull();
    await waitFor(() => expect(mocks.getFleetLocations).toHaveBeenCalled());
  });
});
