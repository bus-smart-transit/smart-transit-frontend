import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import DriverStopCard from '../DriverStopCard';

// 2026-11-13 (user): one stop at a time on the Driver's Trip page, with its one button.
const stops = (acked = 0) => ['Ecoland Terminal', 'Buhangin', 'Panacan', 'Tagum Terminal'].map((stop_name, i) => ({
  stop_id: i + 1, stop_name, sequence_number: i + 1, is_acknowledged: i < acked,
}));

describe('DriverStopCard', () => {
  it('holds Depart at the starting terminal and passes the step on', () => {
    const onStep = vi.fn();
    render(<DriverStopCard stops={stops()} tripStatus="boarding" isPaired step={{ key: 'depart', label: 'Depart' }} onStep={onStep} />);
    const card = screen.getByTestId('driver-stop-card');
    expect(card).toHaveAttribute('data-phase', 'start');
    expect(within(card).getByRole('heading', { name: /Ecoland Terminal/ })).toBeInTheDocument();
    expect(screen.getByTestId('driver-stop-count')).toHaveTextContent('Stop 1 of 4');
    fireEvent.click(screen.getByRole('button', { name: 'Depart' }));
    expect(onStep).toHaveBeenCalledWith('depart');
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
  });

  it('says why the terminal button is off (Depart not open yet)', () => {
    render(<DriverStopCard stops={stops()} tripStatus="boarding" isPaired step={{ key: 'depart', label: 'Depart', disabled: true, reason: 'Depart opens at 8:00 AM' }} />);
    expect(screen.getByRole('button', { name: 'Depart' })).toBeDisabled();
    expect(screen.getByTestId('trip-action-reason')).toHaveTextContent('Depart opens at 8:00 AM');
  });

  it('on the road shows only the next stop with Acknowledge, and the stop after it', () => {
    const onAcknowledge = vi.fn();
    render(<DriverStopCard stops={stops(1)} tripStatus="departed" isPaired onAcknowledge={onAcknowledge} />);
    expect(screen.getByRole('heading', { name: /Buhangin/ })).toBeInTheDocument();
    expect(screen.getByText(/After this:/)).toHaveTextContent('After this: Panacan');
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(onAcknowledge).toHaveBeenCalledWith(2);
    expect(screen.queryByRole('button', { name: 'End Trip' })).not.toBeInTheDocument();
  });

  it('keeps Acknowledge off until the crew is paired', () => {
    render(<DriverStopCard stops={stops(1)} tripStatus="departed" isPaired={false} />);
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeDisabled();
  });

  it('shows End Trip on the last stop once it is reached', () => {
    const onEndTrip = vi.fn();
    render(<DriverStopCard stops={stops(4)} tripStatus="in-progress" isPaired onEndTrip={onEndTrip} />);
    expect(screen.getByTestId('driver-stop-card')).toHaveAttribute('data-phase', 'end');
    fireEvent.click(screen.getByRole('button', { name: 'End Trip' }));
    expect(onEndTrip).toHaveBeenCalled();
  });

  it('shows a passenger drop-off on the way to the stop, and keeps every stop under All stops', () => {
    const requestedGroups = { before: [], after: { 1: [{ latitude: 7.1, longitude: 125.6, label: 'Near the school', passenger_count: 2 }] }, unknown: [] };
    render(<DriverStopCard stops={stops(1)} tripStatus="departed" isPaired requestedGroups={requestedGroups} />);
    expect(screen.getAllByText(/Near the school/).length).toBeGreaterThan(0);
    const all = screen.getByTestId('driver-all-stops');
    expect(within(all).getByText('All stops (4)')).toBeInTheDocument();
    expect(within(all).getByText('Tagum Terminal')).toBeInTheDocument();
  });
});
