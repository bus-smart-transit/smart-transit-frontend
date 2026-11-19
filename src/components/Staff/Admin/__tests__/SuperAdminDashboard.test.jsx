import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import SuperAdminDashboard from '../SuperAdminDashboard';

const overview = {
  date: '2026-11-06',
  counts: { companies: 2, operators: 3, buses: 5, routes: 4, trips_today: 0, tickets_paid_today: 7 },
  attention: [
    { key: 'needs_refund', label: 'Payments to refund by hand (paid, but no ticket was made)', count: 0 },
    { key: 'stops_not_pinned', label: 'Stops not yet pinned on the map (their Company Admin re-pins them)', count: 3 },
  ],
};

describe('SuperAdminDashboard', () => {
  it('shows the platform counts, zero as zero, and the needs-attention list', () => {
    render(<SuperAdminDashboard overview={overview} loading={false} error="" onReload={vi.fn()} />);
    const counts = screen.getByRole('region', { name: 'Platform counts' });
    expect(within(counts).getByText('Companies')).toBeInTheDocument();
    expect(within(counts).getByText('Tickets paid today')).toBeInTheDocument();
    expect(within(counts).getByText('7')).toBeInTheDocument();
    expect(within(counts).getByText('0')).toBeInTheDocument();
    expect(screen.getByText(/Stops not yet pinned/).closest('li')).toHaveTextContent('3');
  });

  it('says plainly when the overview could not be loaded, and Refresh asks again', () => {
    const onReload = vi.fn();
    render(<SuperAdminDashboard overview={null} loading={false} error="The overview could not be loaded. Try again." onReload={onReload} />);
    expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');
    expect(screen.queryByRole('region', { name: 'Platform counts' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onReload).toHaveBeenCalled();
  });
});
