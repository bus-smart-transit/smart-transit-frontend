import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../PassengerService/PassengerService', () => ({
  default: { getFleetLocations: vi.fn() },
}));

import PassengerService from '../../../PassengerService/PassengerService';
import { fetchFleetLocationsForMap } from '../useMapView';

describe('fetchFleetLocationsForMap', () => {
  afterEach(() => vi.clearAllMocks());

  it('shares one request between concurrent map refreshes', async () => {
    let resolveRequest;
    PassengerService.getFleetLocations.mockImplementation(() => new Promise((resolve) => {
      resolveRequest = resolve;
    }));

    const first = fetchFleetLocationsForMap();
    const second = fetchFleetLocationsForMap();
    const result = { data: [{ fleet_id: 1 }] };
    resolveRequest(result);

    await expect(Promise.all([first, second])).resolves.toEqual([result, result]);
    expect(PassengerService.getFleetLocations).toHaveBeenCalledTimes(1);
  });

  it('starts a fresh request after the shared request settles', async () => {
    PassengerService.getFleetLocations.mockResolvedValue({ data: [] });

    await fetchFleetLocationsForMap();
    await fetchFleetLocationsForMap();

    expect(PassengerService.getFleetLocations).toHaveBeenCalledTimes(2);
  });
});