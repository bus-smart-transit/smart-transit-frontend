import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Map rendering uses maplibre-gl, which is intentionally loaded as a separate async chunk.
    chunkSizeWarningLimit: 1100,
  },
});
