import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import TripTimeline from './TripTimeline';

const row = (id, extra = {}) => ({
  stop_id: id, name: `Stop ${id}`, municipality: null, type: 'stop', custom: false, is_boarding: false, is_alighting: false,
  in_journey: true, selectable: true, progress: 'upcoming', eta: '2030-01-01T08:00:00+08:00', eta_time: '08:00', eta_source: 'scheduled', distance_km: id, ...extra,
});

const timeline = (overrides = {}) => ({
  trip: { trip_id: 1, departure_time: '07:30', route_id: 1, leg_direction: 'outbound' },
  bus: { plate_number: 'PLATE-1', class: null },
  header: { bound_for: 'Last Stop', via: ['Mid A', 'Mid B'], duration_minutes: 95, stops_between: 2, distance_km: 33 },
  journey: { boarding_stop_id: 1, alighting_stop_id: 5, custom_dropoff: false },
  allow_custom_dropoff: false,
  collapse_min_stops: 3,
  stops: [
    row(1, { is_boarding: true, selectable: false }),
    row(2, { type: 'pass_through', selectable: false }),
    row(3, { type: 'pass_through', selectable: false }),
    row(4, { type: 'pass_through', selectable: false }),
    row(5, { is_alighting: true, eta: null, eta_time: null, eta_source: null }),
  ],
  ...overrides,
});

describe('TripTimeline', () => {
  test('shows the header without a bus class, badges, ETA unavailable, and folds pass-through runs', () => {
    render(<TripTimeline timeline={timeline()} />);

    expect(screen.getByText('Last Stop')).toBeInTheDocument();
    expect(screen.getByText(/via Mid A, Mid B/)).toBeInTheDocument();
    expect(screen.getByText('PLATE-1')).toBeInTheDocument();
    expect(screen.getByText('1 h 35 min')).toBeInTheDocument();
    expect(screen.queryByText(/class/i)).not.toBeInTheDocument();
    expect(screen.getByText('Board here')).toBeInTheDocument();
    expect(screen.getByText('Get off here')).toBeInTheDocument();
    expect(screen.getByText('ETA unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Stop 3')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show 3 stops/i }));
    expect(screen.getByText('Stop 3')).toBeInTheDocument();
  });

  test('choosing a selectable stop asks the server to recompute via the callback', () => {
    const onSelect = vi.fn();
    const data = timeline({
      stops: [row(1, { is_boarding: true, selectable: false }), row(2), row(3)],
    });
    render(<TripTimeline timeline={data} onSelectAlighting={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Get off at Stop 3' }));
    expect(onSelect).toHaveBeenCalledWith(3);
    expect(screen.queryByRole('button', { name: 'Get off at Stop 1' })).not.toBeInTheDocument();
  });

  test('offers the custom drop-off pin only when the route allows it', () => {
    const { rerender } = render(<TripTimeline timeline={timeline()} />);
    expect(screen.queryByText(/drop off somewhere else/i)).not.toBeInTheDocument();

    rerender(<TripTimeline timeline={timeline({ allow_custom_dropoff: true })} />);
    expect(screen.getByText(/drop off somewhere else/i)).toBeInTheDocument();
  });
});
