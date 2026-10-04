import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import TripTimeline from './TripTimeline';

const row = (id, extra = {}) => ({
  stop_id: id, name: `Stop ${id}`, municipality: null, type: 'stop', custom: false, is_boarding: false, is_alighting: false,
  in_journey: true, selectable: true, progress: 'upcoming', eta: '2030-01-01T08:00:00+08:00', eta_time: '08:00', eta_source: 'scheduled', distance_km: id, ...extra,
});

const timeline = (overrides = {}) => ({
  trip: { trip_id: 1, departure_time: '07:30', route_id: 1, leg_direction: 'outbound' },
  bus: { label: 'BUS - 1', class: null },
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
  test('shows the header with the bus class and fleet type as not specified when unset, badges, ETA unavailable, and folds pass-through runs', () => {
    render(<TripTimeline timeline={timeline()} />);

    expect(screen.getByText('Last Stop')).toBeInTheDocument();
    expect(screen.getByText(/via Mid A, Mid B/)).toBeInTheDocument();
    expect(screen.getByText('BUS - 1')).toBeInTheDocument();
    expect(screen.getByText('1 h 35 min')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-bus-class')).toHaveTextContent('Class not specified');
    expect(screen.getByTestId('timeline-bus-class')).toHaveTextContent('Fleet type not specified');
    expect(screen.getByText('You board here')).toBeInTheDocument();
    expect(screen.getByText('You get off here')).toBeInTheDocument();
    expect(screen.getByText('ETA unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Stop 3')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show 3 stops/i }));
    expect(screen.getByText('Stop 3')).toBeInTheDocument();
  });

  test('shows the class and the fleet type from the data, side by side', () => {
    render(<TripTimeline timeline={timeline({ bus: { label: 'BUS - 1', class: 'aircon', class_label: 'Aircon', fleet_type: 'public' } })} />);

    expect(screen.getByTestId('timeline-bus-class')).toHaveTextContent('Aircon');
    expect(screen.getByTestId('timeline-bus-class')).toHaveTextContent('Public');
    expect(screen.getByTestId('timeline-bus-class')).not.toHaveTextContent('not specified');
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

  test('on a listed-points route the control is worded for points, and a chosen point shows its kind', () => {
    const onOpen = vi.fn();
    render(
      <TripTimeline
        timeline={timeline({
          allow_custom_dropoff: true,
          dropoff_mode: 'designated_points',
          custom_dropoff_availability: { available: true, reason: null },
          journey: { boarding_stop_id: 1, alighting_stop_id: null, custom_dropoff: true },
          stops: [row(1, { is_boarding: true, selectable: false }), row(null, { stop_id: null, name: 'Typed Point', type: 'custom', custom: true, point_kind: 'landmark', is_alighting: true }), row(5)],
        })}
        onOpenCustomDropoff={onOpen}
      />,
    );

    expect(screen.queryByText(/drop off somewhere else/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /drop off at a listed point/i }));
    expect(onOpen).toHaveBeenCalled();
    expect(screen.getByText('Typed Point')).toBeInTheDocument();
    expect(screen.getByText('landmark')).toBeInTheDocument();
  });

  test('when the route offers the pin but the selection cannot use it, the control shows disabled with the server reason', () => {
    const reason = 'You board at the last stop of this trip, so there is nothing ahead to drop off at.';
    const onOpen = vi.fn();
    render(
      <TripTimeline
        timeline={timeline({ allow_custom_dropoff: true, custom_dropoff_availability: { available: false, reason } })}
        onOpenCustomDropoff={onOpen}
      />,
    );

    const button = screen.getByRole('button', { name: /drop off somewhere else/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(reason);
    expect(screen.getByText(reason)).toBeInTheDocument();
    fireEvent.click(button);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('the pin control is enabled when the server says it is available', () => {
    const onOpen = vi.fn();
    render(
      <TripTimeline
        timeline={timeline({ allow_custom_dropoff: true, custom_dropoff_availability: { available: true, reason: null } })}
        onOpenCustomDropoff={onOpen}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /drop off somewhere else/i }));
    expect(onOpen).toHaveBeenCalled();
  });

  test('the control is hidden, with no reason text, when the flag is off', () => {
    render(<TripTimeline timeline={timeline({ custom_dropoff_availability: { available: false, reason: null } })} />);
    expect(screen.queryByText(/drop off somewhere else/i)).not.toBeInTheDocument();
  });
});
