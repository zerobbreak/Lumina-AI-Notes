import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { aiDailyUsage, aiRateLimitWindows, users } from "../src/db/schema/index.js";
import { MAX_AI_CALLS_PER_DAY, MAX_AI_CALLS_PER_MINUTE } from "../src/middleware/ai-rate-limit.js";
import { AUDIO_LIMIT_MINUTES, MAX_TRANSCRIBE_BYTES } from "../src/recordings/usage.js";
import { bearer, buildApp, createTestDb, fakeStorage, testEnv } from "./helpers.js";

const ALICE = "user_alice";
const BOB = "user_bob";
const today = () => new Date().toISOString().slice(0, 10);

let db: Db;
let closeDb: () => Promise<void>;
let fake: ReturnType<typeof fakeStorage>;
let app: ReturnType<typeof buildApp>;

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
});
afterAll(() => closeDb?.());

beforeEach(async () => {
  await db.delete(users); // cascades to both quota tables
  fake = fakeStorage();
  // A key is configured, but every test here is refused before Gemini is reached.
  app = buildApp({ db, storage: fake.storage, env: { ...testEnv, GEMINI_API_KEY: "fake-key" } });
});

const as = (user: string) => ({
  get: (path: string) => request(app).get(path).set("Authorization", bearer(user)),
  post: (path: string) => request(app).post(path).set("Authorization", bearer(user)),
});

async function userId(clerkUserId: string) {
  await as(clerkUserId).get("/api/v1/users/me").expect(200);
  const [row] = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId));
  return row.id;
}

async function spendDay(clerkUserId: string) {
  await db.insert(aiDailyUsage).values({ userId: await userId(clerkUserId), day: today(), count: MAX_AI_CALLS_PER_DAY });
}

async function spendMinute(clerkUserId: string) {
  const windowStart = new Date(Math.floor(Date.now() / 60_000) * 60_000);
  await db
    .insert(aiRateLimitWindows)
    .values({ userId: await userId(clerkUserId), windowStart, count: MAX_AI_CALLS_PER_MINUTE });
}

describe("daily AI limit", () => {
  it("refuses AI calls once the day's quota is spent", async () => {
    await spendDay(ALICE);
    const res = await as(ALICE).post("/api/v1/ai/simplify-text").send({ text: "hi" });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("daily_limit_reached");
  });

  it("is per user", async () => {
    await spendDay(ALICE);
    await spendMinute(BOB); // so Bob's call stops at the limiter rather than reaching Gemini
    const res = await as(BOB).post("/api/v1/ai/simplify-text").send({ text: "hi" });
    expect(res.body.error.code).toBe("rate_limited");
  });

  it("doesn't count calls the per-minute limit already refused", async () => {
    await spendMinute(ALICE);
    for (let i = 0; i < 5; i++) {
      expect((await as(ALICE).post("/api/v1/ai/simplify-text").send({ text: "hi" })).status).toBe(429);
    }
    expect(await db.select().from(aiDailyUsage)).toHaveLength(0);
  });
});

describe("Gemini-backed routes outside /ai", () => {
  it("rate-limits chat replies", async () => {
    const session = await as(ALICE).post("/api/v1/chats/sessions").send({ title: "Revision" });
    await spendMinute(ALICE);
    const res = await as(ALICE).post(`/api/v1/chats/sessions/${session.body.id}/reply`).send({ question: "What is entropy?" });
    expect(res.status).toBe(429);
  });

  it("404s a reply to someone else's session without spending anyone's quota", async () => {
    const session = await as(ALICE).post("/api/v1/chats/sessions").send({ title: "Revision" });
    const res = await as(BOB).post(`/api/v1/chats/sessions/${session.body.id}/reply`).send({ question: "hi" });
    expect(res.status).toBe(404);
    expect(await db.select().from(aiRateLimitWindows)).toHaveLength(0);
  });

  it("rate-limits semantic search", async () => {
    await spendDay(ALICE);
    const res = await as(ALICE).get("/api/v1/search/semantic?query=entropy");
    expect(res.status).toBe(429);
  });

  it("doesn't charge an empty semantic search, which never reaches Gemini", async () => {
    expect((await as(ALICE).get("/api/v1/search/semantic?query=")).status).toBe(200);
    expect(await db.select().from(aiRateLimitWindows)).toHaveLength(0);
  });
});

describe("transcription guards", () => {
  const key = `users/${ALICE}/rec/lecture.webm`;

  async function useAllAudioMinutes() {
    await db
      .update(users)
      .set({ monthlyUsage: { audioMinutesUsed: AUDIO_LIMIT_MINUTES, notesCreated: 0, lastResetDate: Date.now() } })
      .where(eq(users.id, await userId(ALICE)));
  }

  it.each(["/api/v1/ai/transcribe-audio", "/api/v1/ai/isolate-and-transcribe"])(
    "%s refuses once the month's audio minutes are used up",
    async (path) => {
      await useAllAudioMinutes();
      fake.objects.set(key, { size: 1024, contentType: "audio/webm" });
      const res = await as(ALICE).post(path).send({ storageKey: key, mimeType: "audio/webm" });
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/audio minutes/);
      expect(fake.mock.getBytes).not.toHaveBeenCalled();
    },
  );

  it("isolate-and-transcribe refuses an oversized file before reading it", async () => {
    fake.objects.set(key, { size: MAX_TRANSCRIBE_BYTES + 1, contentType: "audio/webm" });
    const res = await as(ALICE).post("/api/v1/ai/isolate-and-transcribe").send({ storageKey: key, mimeType: "audio/webm" });
    expect(res.body).toMatchObject({ success: false });
    expect(res.body.error).toMatch(/too large/);
    expect(fake.mock.getBytes).not.toHaveBeenCalled();
  });
});
