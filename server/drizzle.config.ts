import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't read .env itself.
try {
  process.loadEnvFile(".env");
} catch {
  // No .env: rely on the real environment (e.g. `railway run`).
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
