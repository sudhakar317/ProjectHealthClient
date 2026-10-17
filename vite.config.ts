import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Set BACKEND_URL (e.g. http://10.204.67.197:8080) to point the dev proxy at the LAN IP of the Spring server.
const backend = process.env.BACKEND_URL ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: {
    rollupOptions: {
      output: {
        // Libraries change far less often than the app. In their own chunks they stay cached across
        // deploys, so a release only re-downloads the code that actually changed.
        // Matched by path rather than package name: the name form missed react-dom/client and its
        // scheduler, which left most of React in the app chunk. Vite normalizes module ids to forward
        // slashes on every OS, Windows included, so "/" is the only separator to match.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
            return "react";
          }
          if (id.includes("@tanstack")) return "query";
          if (/\/node_modules\/(react-hook-form|@hookform|zod)\//.test(id)) return "forms";
          if (id.includes("@radix-ui")) return "radix";
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    // Listen on all interfaces so phones on the same hotspot/LAN can reach it.
    host: true,
    // Same-origin in dev: the browser only ever talks to :5173, so no CORS.
    proxy: {
      "/api": backend,
      "/oauth2": backend,
      "/login": backend,
      "/logout": backend,
    },
  },
});
