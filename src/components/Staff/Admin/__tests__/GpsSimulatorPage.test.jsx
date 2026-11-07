import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import GpsSimulatorPage from '../GpsSimulatorPage';

vi.mock('../../../Map/RouteMap', () => ({ default: ({ vehicle }) => <div data-testid="map">{vehicle ? `${vehicle.latitude},${vehicle.longitude}` : 'no bus'}</div> }));

const trip = { trip_id: 9, route_name: 'Ecoland - Tagum', bus_label: { company: 'Co G', body_no: '2' }, trip_date: '2026-11-07', departure_time: '08:00', status: 'departed', has_route_line: true, simulated: false };
const sim = { id: 3, trip_id: 4, route_id: 2, leg_direction: 'outbound', route_name: 'Panabo - Carmen', bus_label: null, status: 'running', speed: 5, progress_percent: 40, position: { latitude: 7.1, longitude: 125.6 }, stops: [{ stop_id: 11, name: 'Maa' }], expires_at: null };

const tab = (over = {}) => ({
  data: { enabled: true, speeds: [1, 5, 10], max_minutes: 30, simulations: [], trips: [trip] },
  loading: false, error: '', busy: false, reload: vi.fn(), start: vi.fn().mockResolvedValue(true), control: vi.fn().mockResolvedValue(true),
  ...over,
});

// Batch 49 item 4: the Super Admin GPS simulator.
describe('GpsSimulatorPage', () => {
  test('says when the master switch is off and offers nothing to start', () => {
    const t = tab();
    t.data = { ...t.data, enabled: false };
    render(<GpsSimulatorPage simulatorTab={t} />);
    expect(screen.getByTestId('gps-simulator-off')).toHaveTextContent('GPS_SIMULATOR_ENABLED');
    expect(screen.getByRole('button', { name: 'Take control of GPS location' })).toBeDisabled();
  });

  test('asks for confirmation, with the speed, before taking control', () => {
    const t = tab();
    render(<GpsSimulatorPage simulatorTab={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'Take control of GPS location' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('marked Simulated');
    expect(dialog).toHaveTextContent('ignored until you press Stop');
    expect(t.start).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('Starting speed'), { target: { value: '10' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yes, take control' }));
    expect(t.start).toHaveBeenCalledWith(9, 10);
  });

  test('shows a running simulation with its map, and pauses, stops, jumps and changes speed', () => {
    const t = tab();
    t.data = { ...t.data, simulations: [sim] };
    render(<GpsSimulatorPage simulatorTab={t} />);

    const card = screen.getByTestId('gps-simulation');
    expect(screen.getByText('Running · Simulated')).toBeInTheDocument();
    expect(card).toHaveTextContent('40% of the route');
    expect(screen.getByTestId('map')).toHaveTextContent('7.1,125.6');

    fireEvent.click(within(card).getByRole('button', { name: 'Pause' }));
    expect(t.control).toHaveBeenCalledWith(3, { action: 'pause' });
    fireEvent.change(within(card).getByLabelText('Speed'), { target: { value: '10' } });
    expect(t.control).toHaveBeenCalledWith(3, { action: 'speed', speed: 10 });
    fireEvent.change(within(card).getByLabelText('Jump to stop'), { target: { value: '11' } });
    fireEvent.click(within(card).getByRole('button', { name: 'Jump' }));
    expect(t.control).toHaveBeenCalledWith(3, { action: 'jump', stop_id: 11 });
    fireEvent.click(within(card).getByRole('button', { name: 'Stop and give control back' }));
    expect(t.control).toHaveBeenCalledWith(3, { action: 'stop' });
  });
});
