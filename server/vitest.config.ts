import { defineConfig } from "vitest/config";

// Without this file Vitest walks up and picks the Next app's jsdom config.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Each DB test file boots PGlite and runs the migrations, which can take
    // well over the 10s default when files start in parallel.
    hookTimeout: 60_000,
  },
});
