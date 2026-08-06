import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
    setupFiles: './src/test/setupTests.js',
    clearMocks: true,
    restoreMocks: true,
  },
  build: {
    // Map rendering uses maplibre-gl, which is intentionally loaded as a separate async chunk.
    chunkSizeWarningLimit: 1100,
  },
});
