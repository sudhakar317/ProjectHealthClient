import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const backend = "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    port: 5173,
    // Same-origin in dev: the browser only ever talks to :5173, so no CORS.
    proxy: {
      "/api": backend,
      "/oauth2": backend,
      "/login": backend,
      "/logout": backend,
    },
  },
});
