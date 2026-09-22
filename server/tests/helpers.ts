import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { vi } from "vitest";
import { createApp } from "../src/app.js";
import type { ClerkProfiles } from "../src/auth/clerk-profiles.js";
import { createTokenVerifier, type TokenVerifier } from "../src/auth/verify-token.js";
import { createDb, type Db } from "../src/db/client.js";
import * as schema from "../src/db/schema/index.js";
import { loadEnv } from "../src/env.js";
import type { Storage } from "../src/storage/s3.js";

/** Stands in for the Clerk instance's signing key; tests sign real RS256 JWTs with it. */
export const clerkKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicPem = clerkKeys.publicKey.export({ type: "spki", format: "pem" }).toString();

export const WEB_ORIGIN = "http://localhost:3000";

export const testEnv = loadEnv({
  NODE_ENV: "test",
  CORS_ORIGINS: `${WEB_ORIGIN},null`,
  // Only used by tests that never query; the rest use PGlite below.
  DATABASE_URL: "postgres://user:pass@localhost:5432/lumina_test",
  CLERK_SECRET_KEY: "sk_test_placeholder",
  // Escaped the way it would be in .env / Railway, to exercise the parsing.
  CLERK_JWT_KEY: publicPem.trim().replace(/\n/g, "\\n"),
  S3_ENDPOINT: "https://storage.example.test",
  S3_BUCKET: "test-bucket",
  S3_ACCESS_KEY_ID: "test",
  S3_SECRET_ACCESS_KEY: "test",
  MAX_UPLOAD_BYTES: String(10 * 1024 * 1024),
});

/** The real verifier, configured with the test key: nothing about Clerk is mocked. */
export const testVerifier: TokenVerifier = createTokenVerifier({
  jwtKey: testEnv.CLERK_JWT_KEY,
  secretKey: testEnv.CLERK_SECRET_KEY,
  authorizedParties: testEnv.CLERK_AUTHORIZED_PARTIES,
});

const b64url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

/**
 * Signs a JWT shaped like a Clerk session token. Override any claim (or pass
 * undefined to drop it), the header, or the signing key to build bad tokens.
 */
export function signToken(
  claims: Record<string, unknown> = {},
  options: { key?: KeyObject; header?: Record<string, unknown> } = {},
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = Object.fromEntries(
    Object.entries({
      sub: "user_test",
      sid: "sess_test",
      azp: WEB_ORIGIN,
      iss: "https://example.clerk.accounts.dev",
      iat: now - 5,
      nbf: now - 10,
      exp: now + 60,
      ...claims,
    }).filter(([, v]) => v !== undefined),
  );
  const header = { alg: "RS256", typ: "JWT", kid: "ins_test", ...options.header };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = sign("sha256", Buffer.from(input), options.key ?? clerkKeys.privateKey);
  return `${input}.${b64url(signature)}`;
}

/** `Authorization` header value for a signed-in test user. */
export const bearer = (clerkUserId: string) => `Bearer ${signToken({ sub: clerkUserId })}`;

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

/** Clerk profile lookups, keyed by Clerk user id. */
export const fakeClerkProfiles = {
  get: vi.fn(async (clerkUserId: string) => ({
    email: `${clerkUserId}@example.test`,
    name: clerkUserId,
    image: null as string | null,
  })),
} satisfies ClerkProfiles;

export function buildApp(
  options: { storage?: Storage; db?: Db; verifyToken?: TokenVerifier; env?: typeof testEnv } = {},
) {
  return createApp({
    env: options.env ?? testEnv,
    db: options.db ?? createDb(testEnv.DATABASE_URL).db,
    storage: options.storage ?? fakeStorage().storage,
    clerkProfiles: fakeClerkProfiles,
    verifyToken: options.verifyToken ?? testVerifier,
  });
}
