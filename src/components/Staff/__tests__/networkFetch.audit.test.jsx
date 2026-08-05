import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, fireEvent, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DriverDashboard from '../DriverDashboard';
import ConductorDashboard from '../ConductorDashboard';
import PairingScreen from '../PairingScreen';
import StaffService from '../../../api/StaffService/StaffService';

const todayIso = new Date().toISOString();

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function mockCommonDriverEndpoints({ paired = false } = {}) {
  vi.spyOn(StaffService, 'getPairingStatus').mockResolvedValue({ data: { paired, reason: paired ? '' : 'Needs pairing' } });
  vi.spyOn(StaffService, 'getProfile').mockResolvedValue({ data: { name: 'Driver One' } });
  vi.spyOn(StaffService, 'getCurrentTrip').mockResolvedValue({ data: null });
  vi.spyOn(StaffService, 'getDriverTrips').mockResolvedValue({ data: [] });
  vi.spyOn(StaffService, 'getCurrentTripStops').mockResolvedValue({ data: [] });
  vi.spyOn(StaffService, 'getDriverPin').mockResolvedValue({ data: { pin_code: '123456' } });
  vi.spyOn(StaffService, 'logout').mockResolvedValue({});
}

function mockCommonConductorEndpoints({ paired = true, withActiveTrip = false } = {}) {
  const trip = withActiveTrip
    ? {
      trip_id: 101,
      trip_date: todayIso,
      status: 'boarding',
      fleet_route: { route: { origin: 'A', destination: 'B', route_stops: [] } },
    }
    : null;

  vi.spyOn(StaffService, 'getPairingStatus').mockResolvedValue({ data: { paired, reason: paired ? '' : 'Needs pairing' } });
  vi.spyOn(StaffService, 'getProfile').mockResolvedValue({ data: { name: 'Conductor One' } });
  vi.spyOn(StaffService, 'getConductorTrip').mockResolvedValue({ data: trip });
  vi.spyOn(StaffService, 'getConductorTrips').mockResolvedValue({ data: trip ? [trip] : [] });
  vi.spyOn(StaffService, 'getTripOccupancy').mockResolvedValue({ data: { boarded: { seated: 2, standing: 1 }, capacity: { total: 20 } } });
  vi.spyOn(StaffService, 'getCurrentPassengers').mockResolvedValue({ data: [] });
  vi.spyOn(StaffService, 'getConductorPin').mockResolvedValue({ data: { pin_code: '654321' } });
  vi.spyOn(StaffService, 'logout').mockResolvedValue({});
}

describe('Network Fetch Audit - Staff dashboards', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('driver pairing status is fetched once on strict-mode mount', async () => {
    mockCommonDriverEndpoints({ paired: true });

    render(
      <StrictMode>
        <MemoryRouter>
          <DriverDashboard />
        </MemoryRouter>
      </StrictMode>,
    );

    await waitFor(() => {
      expect(StaffService.getPairingStatus).toHaveBeenCalledTimes(1);
    });

    expect(StaffService.getProfile).toHaveBeenCalledTimes(1);
    expect(StaffService.getCurrentTrip).toHaveBeenCalledTimes(1);
    expect(StaffService.getDriverTrips).toHaveBeenCalledTimes(1);
  });

  test('driver pairing polling runs every 12s while unpaired and stops after unmount', async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    mockCommonDriverEndpoints({ paired: false });

    const { unmount } = renderWithRouter(<DriverDashboard />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(StaffService.getPairingStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(11999);
      await Promise.resolve();
    });
    expect(StaffService.getPairingStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(StaffService.getPairingStatus).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(12000);
      await Promise.resolve();
    });
    expect(StaffService.getPairingStatus).toHaveBeenCalledTimes(3);

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(24000);
      await Promise.resolve();
    });
    expect(StaffService.getPairingStatus).toHaveBeenCalledTimes(3);
  });

  test('conductor does not refetch pairing status on unrelated parent rerender', async () => {
    mockCommonConductorEndpoints({ paired: true, withActiveTrip: false });

    function Shell({ marker }) {
      return (
        <div>
          <span>{marker}</span>
          <ConductorDashboard />
        </div>
      );
    }

    const { rerender } = renderWithRouter(<Shell marker="one" />);

    await waitFor(() => {
      expect(StaffService.getPairingStatus).toHaveBeenCalledTimes(1);
    });

    rerender(
      <MemoryRouter>
        <Shell marker="two" />
      </MemoryRouter>,
    );

    expect(StaffService.getPairingStatus).toHaveBeenCalledTimes(1);
  });

  test('conductor occupancy fetch triggers exactly once when Occupancy tab is opened', async () => {
    mockCommonConductorEndpoints({ paired: true, withActiveTrip: true });

    renderWithRouter(<ConductorDashboard />);

    await waitFor(() => {
      expect(StaffService.getConductorTrip).toHaveBeenCalledTimes(1);
    });

    const occupancyTab = await screen.findByRole('button', { name: /Occupancy/i });
    fireEvent.click(occupancyTab);

    await waitFor(() => {
      expect(StaffService.getTripOccupancy).toHaveBeenCalledTimes(1);
    });
  });

  test('pairing token refresh is deduped during rapid repeated taps', async () => {
    const deferred = {};
    deferred.promise = new Promise((resolve) => {
      deferred.resolve = resolve;
    });

    vi.spyOn(StaffService, 'getPairingToken')
      .mockResolvedValueOnce({ data: { qr_url: 'https://example.com/qr-1', token_pin: '123456' } })
      .mockImplementationOnce(() => deferred.promise);

    renderWithRouter(<PairingScreen role="conductor" paired={false} />);

    const refreshButton = await screen.findByRole('button', { name: /Refresh QR\/PIN/i });

    fireEvent.click(refreshButton);
    fireEvent.click(refreshButton);
    fireEvent.click(refreshButton);

    expect(StaffService.getPairingToken).toHaveBeenCalledTimes(2);

    deferred.resolve({ data: { qr_url: 'https://example.com/qr-2', token_pin: '654321' } });

    await waitFor(() => {
      expect(StaffService.getPairingToken).toHaveBeenCalledTimes(2);
    });
  });
});
