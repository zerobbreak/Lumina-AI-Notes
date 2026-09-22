import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { vi } from "vitest";
import { createApp } from "../src/app.js";
import type { ClerkProfiles } from "../src/auth/clerk-profiles.js";
import { createDb, type Db } from "../src/db/client.js";
import * as schema from "../src/db/schema/index.js";
import { loadEnv } from "../src/env.js";
import type { Storage } from "../src/storage/s3.js";

// base64("example.clerk.accounts.dev$"): a well-formed key that points nowhere,
// the same placeholder CI uses for the Next build.
export const testEnv = loadEnv({
  NODE_ENV: "test",
  CORS_ORIGINS: "http://localhost:3000,null",
  // Only used by tests that never query; the rest use PGlite below.
  DATABASE_URL: "postgres://user:pass@localhost:5432/lumina_test",
  CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
  CLERK_SECRET_KEY: "sk_test_placeholder",
  S3_ENDPOINT: "https://storage.example.test",
  S3_BUCKET: "test-bucket",
  S3_ACCESS_KEY_ID: "test",
  S3_SECRET_ACCESS_KEY: "test",
  MAX_UPLOAD_BYTES: String(10 * 1024 * 1024),
});

/**
 * In-memory Postgres with pgvector, migrated with the real migration files,
 * so tests exercise the same schema Railway runs.
 */
export async function createTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = new PGlite({ extensions: { vector } });
  const db = drizzle(client, { schema, casing: "snake_case" });
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
  return { db: db as unknown as Db, close: () => client.close() };
}

/** In-memory stand-in for the bucket; records what routes asked it to do. */
export function fakeStorage() {
  const objects = new Map<string, { size: number; contentType: string }>();
  const storage = {
    createUploadUrl: vi.fn(async (key: string, contentType: string, size: number) => ({
      key,
      url: `https://bucket.test/${key}?signed-put&size=${size}`,
      method: "PUT" as const,
      headers: { "Content-Type": contentType },
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    })),
    createDownloadUrl: vi.fn(async (key: string) => `https://bucket.test/${key}?signed-get`),
    stat: vi.fn(async (key: string) => objects.get(key) ?? null),
    put: vi.fn(),
    getBytes: vi.fn(),
    delete: vi.fn(async (key: string) => {
      objects.delete(key);
    }),
  };
  return { storage: storage as unknown as Storage, mock: storage, objects };
}

/** Clerk lookups for first sign-in, keyed by Clerk user id. */
export const fakeClerkProfiles: ClerkProfiles = {
  get: vi.fn(async (clerkUserId: string) => ({
    email: `${clerkUserId}@example.test`,
    name: clerkUserId,
    image: null,
  })),
};

export function buildApp(
  options: { storage?: Storage; db?: Db } = {},
) {
  return createApp({
    env: testEnv,
    db: options.db ?? createDb(testEnv.DATABASE_URL).db,
    storage: options.storage ?? fakeStorage().storage,
    clerkProfiles: fakeClerkProfiles,
  });
}
