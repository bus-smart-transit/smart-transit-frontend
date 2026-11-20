import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 2026-11-20: useLiveRefresh reloads a screen when a live event that concerns it arrives, spread out over bursts.
const handlers = {};
vi.mock('../../../services/live', () => ({
  listen: ({ channel, event, handler }) => {
    handlers[`${channel}:${event}`] = handler;
    return () => { delete handlers[`${channel}:${event}`]; };
  },
  liveConfigured: () => false,
  liveState: () => 'off',
  liveToken: () => null,
  onLiveState: () => () => {},
}));
vi.mock('../../../services/api', () => ({ default: { get: vi.fn() } }));

const { useLiveRefresh } = await import('../useLive');
const send = (key, payload) => act(() => { handlers[key]?.(payload); });

describe('useLiveRefresh', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('reloads only for the events that match', () => {
    const refresh = vi.fn();
    renderHook(() => useLiveRefresh('trip-status', 'trip.status', refresh, { match: (u) => u.trip_id === 7 }));

    send('trip-status:trip.status', { trip_id: 3 });
    expect(refresh).not.toHaveBeenCalled();
    send('trip-status:trip.status', { trip_id: 7 });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('spreads a burst out to one reload per gap and keeps the last one', () => {
    const refresh = vi.fn();
    renderHook(() => useLiveRefresh('fleet-positions', 'bus.moved', refresh, { minGapMs: 4000 }));

    send('fleet-positions:bus.moved', { n: 1 });
    send('fleet-positions:bus.moved', { n: 2 });
    send('fleet-positions:bus.moved', { n: 3 });
    expect(refresh).toHaveBeenCalledTimes(1);

    act(() => { vi.advanceTimersByTime(4000); });
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('listens to nothing until the channel is known', () => {
    const refresh = vi.fn();
    renderHook(() => useLiveRefresh(null, 'tickets', refresh, { isPrivate: true }));

    expect(Object.keys(handlers).some((key) => key.endsWith(':tickets'))).toBe(false);
  });
});
