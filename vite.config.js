import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
    setupFiles: './src/test/setupTests.js',
    // Batch 58: live updates are off in tests (a local .env may have a Reverb key); a test that needs them turns them on.
    env: { VITE_REVERB_APP_KEY: '' },
    clearMocks: true,
    restoreMocks: true,
  },
  build: {
    // Map rendering uses maplibre-gl, which is intentionally loaded as a separate async chunk.
    chunkSizeWarningLimit: 1100,
  },
});
