import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import useStopArrivals from '../../../../api/hooks/Passenger/useStopArrivals';
import StopArrivalsCard from '../StopArrivalsCard';

vi.mock('../../../../api/hooks/Passenger/useStopArrivals', () => ({ default: vi.fn() }));

// SAMPLE arrivals, shaped like the server's StopArrivalsService (Batch 77).
const answer = {
  stop: { stop_code: 'sample-stop', name: 'Sample Stop', municipality: 'Sample City' },
  arrivals: [
    { trip_id: 1, bus_company: 'Sample Lines', body_no: '1024', destination: 'Sample Terminal', eta_minutes: 3, scheduled_time: '13:05', eta_time: '13:05', late_by_minutes: 0, live: true, delayed: false },
    { trip_id: 2, bus_company: 'Other Lines', body_no: '2031', destination: 'Far Town', eta_minutes: 8, scheduled_time: '13:02', eta_time: '13:10', late_by_minutes: 8, live: true, delayed: true },
  ],
  total: 5,
  updated_at: new Date().toISOString(),
};

describe('StopArrivalsCard (Batch 77)', () => {
  it('shows the stop, its next buses with minutes and bands, and how fresh the times are', () => {
    useStopArrivals.mockReturnValue({ loading: false, data: answer, error: '' });
    render(<StopArrivalsCard stop={{ code: 'sample-stop', name: 'Sample Stop' }} onClose={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Sample Stop' })).toBeInTheDocument();
    // Batch 79: the body number on its own line (never cut off), the company under it, then the expected time and the ETA.
    expect(screen.getByText('1024')).toBeInTheDocument();
    expect(screen.getByText('Sample Lines')).toBeInTheDocument();
    expect(screen.getByText('Expected 1:05 PM · ETA 1:05 PM')).toBeInTheDocument();
    expect(screen.getByText('Expected 1:02 PM · ETA 1:10 PM')).toBeInTheDocument();
    expect(screen.getByText('To Sample Terminal')).toBeInTheDocument();
    expect(screen.getByText('3 min')).toBeInTheDocument();
    expect(screen.getByText('Arriving')).toBeInTheDocument();
    expect(screen.getByText('Delayed +8 min')).toBeInTheDocument();
    expect(screen.getByText('Live updates')).toBeInTheDocument();
    expect(screen.getByText('Last updated just now')).toBeInTheDocument();
  });

  it('asks for every arrival, and opens the trips from the stop', () => {
    useStopArrivals.mockReturnValue({ loading: false, data: answer, error: '' });
    const onViewTrips = vi.fn();
    render(<StopArrivalsCard stop={{ code: 'sample-stop', name: 'Sample Stop' }} onClose={() => {}} onViewTrips={onViewTrips} />);

    fireEvent.click(screen.getByTestId('view-all-arrivals'));
    expect(useStopArrivals).toHaveBeenLastCalledWith('sample-stop', true);
    fireEvent.click(screen.getByTestId('stop-pin-trips'));
    expect(onViewTrips).toHaveBeenCalledWith('sample-stop');
  });

  it('says plainly when no bus is due', () => {
    useStopArrivals.mockReturnValue({ loading: false, data: { ...answer, arrivals: [], total: 0 }, error: '' });
    render(<StopArrivalsCard stop={{ code: 'sample-stop', name: 'Sample Stop' }} onClose={() => {}} />);

    expect(screen.getByTestId('arrivals-none')).toBeInTheDocument();
  });
});
