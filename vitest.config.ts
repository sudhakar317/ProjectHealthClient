import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

// Reuses the app's Vite config, so tests resolve "@/..." and transform JSX exactly as the build does.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      // Styling is Tailwind classes; no test asserts on computed CSS, so skip processing it.
      css: false,
      restoreMocks: true,
      // A UTC+5:30 zone on purpose: in UTC, local and UTC dates always agree, so the date helpers'
      // tests would pass even with the toISOString() bug that put midnight-to-05:30 on yesterday.
      env: { TZ: "Asia/Kolkata" },
    },
  }),
);
