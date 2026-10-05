import { afterEach, describe, expect, it, vi } from 'vitest';
import { BaseService } from '../BaseService';
import ConductorService from './ConductorService';

describe('Conductor Start Shift (Batch 29: opening cash)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends the declared opening cash to the server', async () => {
    const request = vi.spyOn(BaseService.prototype, 'request').mockResolvedValue({ data: { shift: {} } });

    await ConductorService.startConductorShift(250.5);

    expect(request).toHaveBeenCalledWith('/conductor/shift/start', 'POST', { opening_cash: 250.5 });
  });

  it('defaults the opening cash to 0 and never sends NaN', async () => {
    const request = vi.spyOn(BaseService.prototype, 'request').mockResolvedValue({ data: { shift: {} } });

    await ConductorService.startConductorShift();
    await ConductorService.startConductorShift('not a number');

    expect(request).toHaveBeenNthCalledWith(1, '/conductor/shift/start', 'POST', { opening_cash: 0 });
    expect(request).toHaveBeenNthCalledWith(2, '/conductor/shift/start', 'POST', { opening_cash: 0 });
  });
});
