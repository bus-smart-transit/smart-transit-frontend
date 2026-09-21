import { describe, expect, test } from 'vitest';
import { initFcmAndGetToken } from '../fcmService';

// Batch 15, Items 2/3: fcmService must be fail-soft — in this jsdom test
// environment there is no real `Notification`/`serviceWorker` API and no
// live Firebase project reachable, so this test proves the guarantee that
// matters most: calling initFcmAndGetToken() never throws and resolves to
// null instead of crashing the dashboard that calls it.
describe('fcmService', () => {
  test('initFcmAndGetToken resolves to null instead of throwing when push is unsupported/unconfigured', async () => {
    await expect(initFcmAndGetToken()).resolves.toBeNull();
  });
});
