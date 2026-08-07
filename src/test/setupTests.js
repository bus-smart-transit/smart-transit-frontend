import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { server } from './mswServer';

vi.mock('qr-scanner', () => {
  return {
    default: class MockQrScanner {
      constructor() {}
      async start() {}
      destroy() {}
      stop() {}
    },
  };
});

afterEach(() => {
  cleanup();
});

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
