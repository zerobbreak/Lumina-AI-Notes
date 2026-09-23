import { generateKeyPairSync, createHmac } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTokenVerifier } from "../src/auth/verify-token.js";
import type { Db } from "../src/db/client.js";
import { users } from "../src/db/schema/index.js";
import { loadEnv } from "../src/env.js";
import {
  bearer,
  buildApp,
  clerkKeys,
  createTestDb,
  fakeClerkProfiles,
  signToken,
  testEnv,
} from "./helpers.js";

let db: Db;
let closeDb: () => Promise<void>;
let app: ReturnType<typeof buildApp>;

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
});
afterAll(() => closeDb?.());

beforeEach(async () => {
  await db.delete(users);
  app = buildApp({ db });
});

const now = () => Math.floor(Date.now() / 1000);
const session = (authorization?: string) => {
  const req = request(app).get("/api/v1/auth/session");
  return authorization ? req.set("Authorization", authorization) : req;
};

/** Expects a 401 with the given error code and an RFC 6750 challenge. */
async function expectRejected(authorization: string | undefined, code: string) {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const res = await session(authorization);
  expect(res.status).toBe(401);
  expect(res.body.error.code).toBe(code);
  expect(res.headers["www-authenticate"]).toMatch(/^Bearer realm="lumina"/);
  return res;
}

describe("GET /api/v1/auth/session", () => {
  it("accepts a valid token and returns the session and user", async () => {
    const exp = now() + 60;
    const res = await session(`Bearer ${signToken({ sub: "user_alice", sid: "sess_1", exp })}`);

    expect(res.status).toBe(200);
    expect(res.body.session).toEqual({
      clerkUserId: "user_alice",
      sessionId: "sess_1",
      authorizedParty: "http://localhost:3000",
      expiresAt: exp * 1000,
    });
    expect(res.body.user).toMatchObject({ clerkUserId: "user_alice", email: "user_alice@example.test" });
  });

  it("gives new users the defaults Convex's createOrUpdateUser used", async () => {
    const res = await session(bearer("user_new"));
    expect(res.body.user).toMatchObject({
      onboardingComplete: false,
      tourCompleted: false,
      tourStep: 0,
      courses: [],
    });
    // Gamification lives on /users/me/gamification, not the session user payload.
    expect(res.body.user).not.toHaveProperty("currentStreak");
    expect(res.body.user).not.toHaveProperty("badges");
  });

  it("tolerates a few seconds of clock skew", async () => {
    const res = await session(`Bearer ${signToken({ exp: now() - 2 })}`);
    expect(res.status).toBe(200);
  });
});

describe("rejected tokens", () => {
  it("no Authorization header", async () => {
    await expectRejected(undefined, "unauthenticated");
  });

  it.each([["Basic dXNlcjpwYXNz"], ["Bearer"], ["Bearer not-a-jwt"], ["Bearer a.b"]])(
    "malformed header %s",
    async (authorization) => {
      const res = await expectRejected(authorization, "invalid_token");
      expect(res.headers["www-authenticate"]).toContain('error="invalid_request"');
    },
  );

  it("expired: tells the client to refresh, not sign out", async () => {
    const res = await expectRejected(`Bearer ${signToken({ exp: now() - 60 })}`, "token_expired");
    expect(res.headers["www-authenticate"]).toContain('error="invalid_token"');
  });

  it("not valid yet (nbf in the future)", async () => {
    await expectRejected(`Bearer ${signToken({ nbf: now() + 120 })}`, "invalid_token");
  });

  it("issued in the future", async () => {
    await expectRejected(`Bearer ${signToken({ iat: now() + 120 })}`, "invalid_token");
  });

  it("issued to another site (azp)", async () => {
    await expectRejected(`Bearer ${signToken({ azp: "https://evil.example" })}`, "invalid_token");
  });

  it("no azp claim at all", async () => {
    await expectRejected(`Bearer ${signToken({ azp: undefined })}`, "invalid_token");
  });

  it("Electron's file:// origin is not an issuer", async () => {
    await expectRejected(`Bearer ${signToken({ azp: "null" })}`, "invalid_token");
  });

  it("session still pending required steps (sts)", async () => {
    await expectRejected(`Bearer ${signToken({ sts: "pending" })}`, "invalid_token");
    const active = await session(`Bearer ${signToken({ sts: "active", v: 2 })}`);
    expect(active.status).toBe(200);
  });

  it("no subject", async () => {
    await expectRejected(`Bearer ${signToken({ sub: undefined })}`, "invalid_token");
  });

  it("signed by a different key (another Clerk instance, or forged)", async () => {
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
    await expectRejected(`Bearer ${signToken({}, { key: other.privateKey })}`, "invalid_token");
  });

  it("payload edited after signing (user id swapped)", async () => {
    const [header, , signature] = signToken({ sub: "user_alice" }).split(".");
    const forged = Buffer.from(
      JSON.stringify({ sub: "user_admin", azp: "http://localhost:3000", exp: now() + 60, iat: now(), nbf: now() }),
    ).toString("base64url");
    await expectRejected(`Bearer ${header}.${forged}.${signature}`, "invalid_token");
  });

  it('alg "none"', async () => {
    const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const token = `${enc({ alg: "none", typ: "JWT" })}.${enc({ sub: "user_x", azp: "http://localhost:3000", exp: now() + 60 })}.`;
    await expectRejected(`Bearer ${token}x`, "invalid_token");
  });

  it("HS256 signed with the public key (algorithm confusion)", async () => {
    const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const input = `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ sub: "user_x", azp: "http://localhost:3000", iat: now(), nbf: now(), exp: now() + 60 })}`;
    const pem = clerkKeys.publicKey.export({ type: "spki", format: "pem" }).toString();
    const mac = createHmac("sha256", pem).update(input).digest("base64url");
    await expectRejected(`Bearer ${input}.${mac}`, "invalid_token");
  });

  it("does not create a user for rejected tokens", async () => {
    await expectRejected(`Bearer ${signToken({ exp: now() - 60 })}`, "token_expired");
    expect(await db.select().from(users)).toHaveLength(0);
  });
});

describe("verification outages", () => {
  it("reports a server error, not 401, when keys can't be loaded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = buildApp({
      db,
      verifyToken: async () => {
        throw new Error("Could not verify session token");
      },
    });
    const res = await request(broken).get("/api/v1/auth/session").set("Authorization", bearer("user_a"));
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("internal_error");
  });
});

describe("POST /api/v1/auth/sync", () => {
  it("refreshes email, name and avatar from Clerk", async () => {
    await session(bearer("user_alice"));
    fakeClerkProfiles.get.mockResolvedValueOnce({
      email: "alice@new.example",
      name: "Alice Smith",
      image: "https://img.clerk.com/alice.png",
    });

    const res = await request(app).post("/api/v1/auth/sync").set("Authorization", bearer("user_alice"));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      clerkUserId: "user_alice",
      email: "alice@new.example",
      name: "Alice Smith",
      image: "https://img.clerk.com/alice.png",
    });
  });
});

describe("configuration", () => {
  it("refuses to build a verifier that would accept any origin", () => {
    expect(() =>
      createTokenVerifier({ secretKey: "sk_test_x", authorizedParties: [] }),
    ).toThrow(/authorized party/);
  });

  it("defaults authorized parties to CORS origins, minus Electron's null", () => {
    expect(testEnv.CLERK_AUTHORIZED_PARTIES).toEqual(["http://localhost:3000"]);
    const explicit = loadEnv({
      ...baseEnv(),
      CLERK_AUTHORIZED_PARTIES: "https://luminanotes.ai, http://localhost:3000",
    });
    expect(explicit.CLERK_AUTHORIZED_PARTIES).toEqual(["https://luminanotes.ai", "http://localhost:3000"]);
  });

  it("accepts CLERK_JWT_KEY with escaped newlines and rejects non-PEM values", () => {
    expect(testEnv.CLERK_JWT_KEY).toMatch(/^-----BEGIN PUBLIC KEY-----\n[\s\S]+\n-----END PUBLIC KEY-----$/);
    expect(() => loadEnv({ ...baseEnv(), CLERK_JWT_KEY: "not a key" })).toThrow(/CLERK_JWT_KEY/);
    // What an unquoted multi-line PEM in .env turns into: only its first line.
    expect(() => loadEnv({ ...baseEnv(), CLERK_JWT_KEY: "-----BEGIN PUBLIC KEY-----" })).toThrow(/CLERK_JWT_KEY/);
  });
});

function baseEnv() {
  return {
    DATABASE_URL: "postgres://u:p@localhost:5432/db",
    CLERK_SECRET_KEY: "sk_test_x",
    S3_ENDPOINT: "https://s3.test",
    S3_BUCKET: "b",
    S3_ACCESS_KEY_ID: "a",
    S3_SECRET_ACCESS_KEY: "s",
    REDIS_URL: "redis://localhost:6379",
    QUEUE_PREFIX: "test",
  };
}
