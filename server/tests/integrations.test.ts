import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { deadlines, lmsConnections, lmsCourseLinks, users } from "../src/db/schema/index.js";
import { toDeadlineResponse } from "../src/deadlines/serialize.js";
import { loadEnv } from "../src/env.js";
import { createSecretBox } from "../src/integrations/secretBox.js";
import { createTestDb, testEnv } from "./helpers.js";

const KEY = randomBytes(32).toString("base64");
const FEED = "https://school.brightspace.com/d2l/le/calendar/feed/user/feed.ics?token=abc123";

describe("secretBox", () => {
  const box = createSecretBox(KEY);

  it("round-trips, and never stores the plaintext", () => {
    const sealed = box.seal(FEED);
    expect(sealed).toMatch(/^v1\./);
    expect(sealed).not.toContain("abc123");
    expect(box.open(sealed)).toBe(FEED);
  });

  it("uses a fresh IV each time", () => {
    expect(box.seal(FEED)).not.toBe(box.seal(FEED));
  });

  it("rejects a tampered value", () => {
    const [v, iv, tag, ciphertext] = box.seal(FEED).split(".");
    const flipped = Buffer.from(ciphertext!, "base64url");
    flipped[0]! ^= 1;
    expect(() => box.open([v, iv, tag, flipped.toString("base64url")].join("."))).toThrow();
  });

  it("rejects a value sealed under another key", () => {
    const other = createSecretBox(randomBytes(32).toString("base64"));
    expect(() => box.open(other.seal(FEED))).toThrow();
  });

  it("rejects something that was never sealed", () => {
    expect(() => box.open(FEED)).toThrow("Not a sealed secret");
  });

  it("fails at call time, not creation, when the key is missing", () => {
    const keyless = createSecretBox(undefined);
    expect(() => keyless.seal(FEED)).toThrow("LMS_ENCRYPTION_KEY");
  });
});

describe("LMS_ENCRYPTION_KEY", () => {
  const base = {
    DATABASE_URL: testEnv.DATABASE_URL,
    CLERK_SECRET_KEY: testEnv.CLERK_SECRET_KEY,
    S3_ENDPOINT: testEnv.S3_ENDPOINT,
    S3_BUCKET: testEnv.S3_BUCKET,
    S3_ACCESS_KEY_ID: "test",
    S3_SECRET_ACCESS_KEY: "test",
    REDIS_URL: testEnv.REDIS_URL,
    QUEUE_PREFIX: "test",
  };

  it("is optional", () => {
    expect(loadEnv(base).LMS_ENCRYPTION_KEY).toBeUndefined();
  });

  it("must be 32 bytes of base64", () => {
    expect(() => loadEnv({ ...base, LMS_ENCRYPTION_KEY: "too-short" })).toThrow(
      /LMS_ENCRYPTION_KEY: Must be 32 bytes/,
    );
    expect(loadEnv({ ...base, LMS_ENCRYPTION_KEY: KEY }).LMS_ENCRYPTION_KEY).toBe(KEY);
  });
});

describe("LMS schema", () => {
  let db: Db;
  let closeDb: () => Promise<void>;
  let userId: string;

  beforeAll(async () => {
    ({ db, close: closeDb } = await createTestDb());
  });
  afterAll(() => closeDb?.());

  beforeEach(async () => {
    await db.delete(users);
    [{ id: userId }] = await db
      .insert(users)
      .values({ clerkUserId: "user_alice", email: "alice@example.test" })
      .returning({ id: users.id });
  });

  const connect = async () => {
    const [row] = await db
      .insert(lmsConnections)
      .values({
        userId,
        provider: "brightspace",
        kind: "ical",
        host: "school.brightspace.com",
        secret: createSecretBox(KEY).seal(FEED),
      })
      .returning();
    return row!;
  };

  const synced = (connectionId: string, externalId: string, title = "Essay 1") => ({
    userId,
    title,
    dueAt: new Date("2026-10-01T21:59:00Z"),
    kind: "assignment" as const,
    source: "brightspace" as const,
    connectionId,
    externalId,
  });

  it("allows one Brightspace connection per student", async () => {
    await connect();
    await expect(connect()).rejects.toThrow();
  });

  it("re-syncing the same LMS item updates one row instead of adding another", async () => {
    const connection = await connect();
    await db.insert(deadlines).values(synced(connection.id, "uid-1"));
    await db
      .insert(deadlines)
      .values(synced(connection.id, "uid-1", "Essay 1 (extended)"))
      .onConflictDoUpdate({
        target: [deadlines.connectionId, deadlines.externalId],
        set: { title: "Essay 1 (extended)" },
      });

    const rows = await db.select().from(deadlines).where(eq(deadlines.userId, userId));
    expect(rows.map((row) => row.title)).toEqual(["Essay 1 (extended)"]);
  });

  it("manual deadlines default to source manual and never collide", async () => {
    const manual = { userId, title: "Revise", dueAt: new Date(), kind: "task" as const };
    await db.insert(deadlines).values([manual, manual]);

    const rows = await db.select().from(deadlines).where(eq(deadlines.userId, userId));
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.source === "manual" && row.connectionId === null)).toBe(true);
  });

  it("disconnecting removes what it synced and its course links, but not manual deadlines", async () => {
    const connection = await connect();
    await db.insert(deadlines).values([
      synced(connection.id, "uid-1"),
      { userId, title: "Revise", dueAt: new Date(), kind: "task" },
    ]);
    await db.insert(lmsCourseLinks).values({
      userId,
      connectionId: connection.id,
      externalKey: "HIST101",
      externalName: "History 101",
    });

    await db.delete(lmsConnections).where(eq(lmsConnections.id, connection.id));

    const rows = await db.select().from(deadlines).where(eq(deadlines.userId, userId));
    expect(rows.map((row) => row.title)).toEqual(["Revise"]);
    expect(await db.select().from(lmsCourseLinks)).toHaveLength(0);
  });

  it("serializes source and link but keeps sync bookkeeping internal", async () => {
    const connection = await connect();
    const [row] = await db
      .insert(deadlines)
      .values({ ...synced(connection.id, "uid-1"), externalUrl: "https://school.brightspace.com/d2l/x" })
      .returning();

    const body = toDeadlineResponse(row!);
    expect(body.source).toBe("brightspace");
    expect(body.externalUrl).toBe("https://school.brightspace.com/d2l/x");
    expect(body).not.toHaveProperty("connectionId");
    expect(body).not.toHaveProperty("externalId");
  });
});
