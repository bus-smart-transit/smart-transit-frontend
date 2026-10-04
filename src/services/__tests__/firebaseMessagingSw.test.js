// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, test, vi } from 'vitest';

// Loads the real service worker file with a fake worker environment and checks
// what a tap on a push notification does (Batch 27, Task 1).
const source = readFileSync(new URL('../../../public/firebase-messaging-sw.js', import.meta.url), 'utf8');

function loadWorker({ windows = [] } = {}) {
  const listeners = {};
  const fakeSelf = {
    location: { origin: 'https://app.example' },
    registration: { showNotification: vi.fn() },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    clients: {
      matchAll: vi.fn().mockResolvedValue(windows),
      openWindow: vi.fn().mockResolvedValue({}),
    },
  };
  const firebase = { initializeApp: vi.fn(), messaging: () => ({ onBackgroundMessage: vi.fn() }) };
  new Function('self', 'importScripts', 'firebase', source)(fakeSelf, vi.fn(), firebase);
  return { fakeSelf, listeners };
}

async function tap(listeners, data) {
  let pending = Promise.resolve();
  const close = vi.fn();
  listeners.notificationclick({ notification: { data, close }, waitUntil: (p) => { pending = p; } });
  await pending;
  return { close };
}

describe('firebase-messaging-sw notificationclick', () => {
  test('opens the assigned trip from the link in the push data', async () => {
    const { fakeSelf, listeners } = loadWorker();
    const { close } = await tap(listeners, { type: 'trip_assigned', trip_id: '42', role: 'driver', link: '/employee/driver/dashboard?tab=dashboard&trip=42' });
    expect(close).toHaveBeenCalled();
    expect(fakeSelf.clients.openWindow).toHaveBeenCalledWith('https://app.example/employee/driver/dashboard?tab=dashboard&trip=42');
  });

  test('rebuilds the path from role and trip id when the link is missing', async () => {
    const { fakeSelf, listeners } = loadWorker();
    await tap(listeners, { type: 'trip_assigned', trip_id: '7', role: 'conductor' });
    expect(fakeSelf.clients.openWindow).toHaveBeenCalledWith('https://app.example/employee/conductor/dashboard?tab=dashboard&trip=7');
  });

  test('reuses an open tab of the app instead of opening a new one', async () => {
    const focus = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn().mockResolvedValue({ focus });
    const { fakeSelf, listeners } = loadWorker({ windows: [{ url: 'https://app.example/employee/driver/dashboard', navigate, focus }] });
    await tap(listeners, { type: 'trip_assigned', trip_id: '5', role: 'driver' });
    expect(navigate).toHaveBeenCalledWith('https://app.example/employee/driver/dashboard?tab=dashboard&trip=5');
    expect(focus).toHaveBeenCalled();
    expect(fakeSelf.clients.openWindow).not.toHaveBeenCalled();
  });

  test('never opens an external link', async () => {
    const { fakeSelf, listeners } = loadWorker();
    await tap(listeners, { type: 'trip_assigned', trip_id: '5', role: 'driver', link: 'https://evil.example/phish' });
    const opened = fakeSelf.clients.openWindow.mock.calls.map((c) => c[0]);
    expect(opened.every((u) => u.startsWith('https://app.example/employee/'))).toBe(true);
  });

  test('other notification types are only dismissed', async () => {
    const { fakeSelf, listeners } = loadWorker();
    const { close } = await tap(listeners, { type: 'trip_cancelled', trip_id: '5', role: 'driver' });
    expect(close).toHaveBeenCalled();
    expect(fakeSelf.clients.openWindow).not.toHaveBeenCalled();
    expect(fakeSelf.clients.matchAll).not.toHaveBeenCalled();
  });
});
