import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// See https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // maplibre-gl loads its rendering code in a Web Worker via a relative
    // import.meta.url; Vite's dependency pre-bundling breaks that URL, so
    // the worker fails to load unless maplibre-gl is left out of it.
    exclude: ["maplibre-gl"],
  },
});
