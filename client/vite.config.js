import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:4000" } }, // same-origin cookies in dev
  build: { rollupOptions: { output: { manualChunks: { charts: ["recharts"], motion: ["framer-motion"], vendor: ["react", "react-dom", "react-router-dom"] } } } },
  test: { environment: "jsdom", globals: true },
});
