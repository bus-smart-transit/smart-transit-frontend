import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, fireEvent, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StrictMode } from 'react';
import DriverDashboard from '../DriverDashboard';
import ConductorDashboard from '../ConductorDashboard';
import PairingScreen from '../PairingScreen';
import { BaseService } from '../../../api/BaseService';

const todayIso = new Date().toISOString();

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Network Fetch Audit - BaseService endpoint call counts', () => {
  let callCounts;

  beforeEach(() => {
    vi.useRealTimers();
    callCounts = {};

    vi.spyOn(BaseService.prototype, 'request').mockImplementation(async (url, method) => {
      const key = `${method.toUpperCase()} ${url}`;
      callCounts[key] = (callCounts[key] || 0) + 1;

      if (url === '/driver/pairing-status') {
        return { data: { paired: false, reason: 'Needs pairing' } };
      }
      if (url === '/conductor/pairing-status') {
        return { data: { paired: true, reason: '' } };
      }

      if (url === '/driver/profile') {
        return { data: { name: 'Driver One' } };
      }
      if (url === '/driver/trips/current') {
        return { data: null };
      }
      if (url === '/driver/trips') {
        return { data: [] };
      }
      if (url === '/driver/pin') {
        return { data: { pin_code: '111111' } };
      }
      if (url === '/driver/trips/current/stops') {
        return { data: [] };
      }

      if (url === '/conductor/profile') {
        return { data: { name: 'Conductor One' } };
      }
      if (url === '/conductor/trips/current') {
        return {
          data: {
            trip_id: 789,
            trip_date: todayIso,
            status: 'boarding',
            fleet_route: { route: { origin: 'A', destination: 'B', route_stops: [] } },
          },
        };
      }
      if (url === '/conductor/trips') {
        return { data: [] };
      }
      if (url === '/conductor/trips/current/occupancy') {
        return { data: { boarded: { seated: 2, standing: 1 }, capacity: { total: 20, seated: 12, standing: 8 } } };
      }
      if (url === '/conductor/trips/current/passengers') {
        return { data: [] };
      }
      if (url === '/conductor/pin') {
        return { data: { pin_code: '222222' } };
      }

      if (url === '/conductor/pairing-token') {
        return { data: { qr_url: 'https://example.com/qr', token_pin: '123456', fleet_plate: 'ABC-123', route_name: 'Main' } };
      }

      if (url.endsWith('/logout')) {
        return { success: true };
      }

      return { data: null };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('pairing status endpoint is called once on conductor mount', async () => {
    renderWithRouter(<ConductorDashboard />);

    await waitFor(() => {
      expect(callCounts['GET /conductor/pairing-status'] || 0).toBe(1);
    });
  });

  test('occupancy endpoint is called exactly once when Occupancy tab opens', async () => {
    renderWithRouter(<ConductorDashboard />);

    const occupancyTab = await screen.findByRole('button', { name: /Occupancy/i });
    fireEvent.click(occupancyTab);

    await waitFor(() => {
      expect(callCounts['GET /conductor/trips/current/occupancy'] || 0).toBe(1);
    });
  });

  test('driver pairing endpoint respects 12-second polling interval', async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });

    renderWithRouter(<DriverDashboard />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(callCounts['GET /driver/pairing-status'] || 0).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(11999);
      await Promise.resolve();
    });
    expect(callCounts['GET /driver/pairing-status'] || 0).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(callCounts['GET /driver/pairing-status'] || 0).toBe(2);
  });

  test('pairing token request is deduped during rapid refresh taps', async () => {
    const deferred = {};
    deferred.promise = new Promise((resolve) => {
      deferred.resolve = resolve;
    });

    let firstDone = false;

    BaseService.prototype.request.mockImplementation(async (url, method) => {
      const key = `${method.toUpperCase()} ${url}`;
      callCounts[key] = (callCounts[key] || 0) + 1;

      if (url === '/conductor/pairing-token' && !firstDone) {
        firstDone = true;
        return { data: { qr_url: 'https://example.com/qr-1', token_pin: '123456', fleet_plate: 'A', route_name: 'R' } };
      }
      if (url === '/conductor/pairing-token') {
        return deferred.promise;
      }

      return { data: null };
    });

    renderWithRouter(<PairingScreen role="conductor" paired={false} />);

    const refreshButton = await screen.findByRole('button', { name: /Refresh QR\/PIN/i });

    fireEvent.click(refreshButton);
    fireEvent.click(refreshButton);
    fireEvent.click(refreshButton);

    expect(callCounts['GET /conductor/pairing-token'] || 0).toBe(2);

    deferred.resolve({ data: { qr_url: 'https://example.com/qr-2', token_pin: '654321', fleet_plate: 'B', route_name: 'R2' } });

    await waitFor(() => {
      expect(callCounts['GET /conductor/pairing-token'] || 0).toBe(2);
    });
  });

  test('strict mode does not duplicate driver pairing status on mount', async () => {
    render(
      <StrictMode>
        <MemoryRouter>
          <DriverDashboard />
        </MemoryRouter>
      </StrictMode>,
    );

    await waitFor(() => {
      expect(callCounts['GET /driver/pairing-status'] || 0).toBe(1);
    });
  });
});
