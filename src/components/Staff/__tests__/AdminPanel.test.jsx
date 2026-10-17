import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminPanel from '../AdminPanel';

const mocks = vi.hoisted(() => ({
  getStops: vi.fn(),
  getRoutes: vi.fn(),
  getAdminFleets: vi.fn(),
  regenerateRouteGeometry: vi.fn(),
}));

vi.mock('../../../api/StaffService/AdminService', () => ({ default: mocks }));
vi.mock('../../../api/hooks/Staff/useFareOptions', () => ({ default: () => ({ vehicle_classes: [] }) }));
vi.mock('../FareRulesPanel', () => ({ default: () => <div>Fare rules</div> }));
vi.mock('../TripCancellationsPanel', () => ({ TicketResolutionQueue: () => <div>Ticket resolutions</div> }));
vi.mock('../DurationFactorsPanel', () => ({ default: () => <div>Duration factors</div> }));
vi.mock('../DropoffRulesPanel', () => ({ default: () => <div>Drop-off rules</div> }));
vi.mock('../../Map/RouteMap', () => ({ default: ({ routeId }) => <div>admin-route-map-{routeId}</div> }));

describe('AdminPanel route geometry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getStops.mockResolvedValue({ data: [] });
    mocks.getRoutes.mockResolvedValue({ data: [{
      route_id: 12,
      route_name: 'Davao to Butuan',
      origin: 'Davao',
      destination: 'Butuan',
      can_regenerate_geometry: true,
      geometry_stale: true,
      geometry_generated_at: '2026-10-16T13:44:43+08:00',
      geometry_regeneration_pending: false,
      geometry_error: null,
    }] });
    mocks.getAdminFleets.mockResolvedValue({ data: [] });
    mocks.regenerateRouteGeometry.mockResolvedValue({ data: { queued: true } });
  });

  it('opens route details and confirms before queueing an Admin redraw', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<AdminPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Routes' }));
    await screen.findByRole('button', { name: 'Route details' });
    fireEvent.click(screen.getByRole('button', { name: 'Route details' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Needs redraw')).toBeInTheDocument();
    expect(within(dialog).getByText(/Last drawn:/)).toBeInTheDocument();
    expect(within(dialog).getByText('admin-route-map-12')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Redraw route line' }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Davao to Butuan'));
    await waitFor(() => expect(mocks.regenerateRouteGeometry).toHaveBeenCalledWith(12));
    confirm.mockRestore();
  });
});