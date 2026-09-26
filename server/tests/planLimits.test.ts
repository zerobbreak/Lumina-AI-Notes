import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { featureName, setAiUsageUser, withAiUsageScope } from "../src/ai/usageContext.js";
import { getGeminiModel } from "../src/ai/gemini.js";
import type { Db } from "../src/db/client.js";
import { aiDailyUsage, aiUsageEvents, users } from "../src/db/schema/index.js";
import { parseOverrides, setUserLimits, usageByFeature, usageByUser } from "../src/plans/admin.js";
import { limitsFor, PLANS } from "../src/plans/limits.js";
import { bearer, buildApp, createTestDb, fakeStorage, testEnv } from "./helpers.js";

vi.mock("@google/generative-ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@google/generative-ai")>();
  class FakeGoogleGenerativeAI {
    getGenerativeModel({ model }: { model: string }) {
      const response = {
        text: () => `reply from ${model}`,
        usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 30, totalTokenCount: 170 },
      };
      return {
        generateContent: async () => ({ response }),
        generateContentStream: async () => ({ stream: (async function* () {})(), response: Promise.resolve(response) }),
      };
    }
  }
  return { ...actual, GoogleGenerativeAI: FakeGoogleGenerativeAI };
});

const ALICE = "user_alice";
const today = () => new Date().toISOString().slice(0, 10);

let db: Db;
let closeDb: () => Promise<void>;
let app: ReturnType<typeof buildApp>;

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
});
afterAll(() => closeDb?.());

beforeEach(async () => {
  await db.delete(aiUsageEvents);
  await db.delete(users);
  app = buildApp({ db, storage: fakeStorage().storage, env: { ...testEnv, GEMINI_API_KEY: "fake-key" } });
});

const as = (user: string) => ({
  get: (path: string) => request(app).get(path).set("Authorization", bearer(user)),
  post: (path: string) => request(app).post(path).set("Authorization", bearer(user)),
});

async function signUp(clerkUserId: string) {
  await as(clerkUserId).get("/api/v1/users/me").expect(200);
  const [row] = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId));
  return row;
}

/** Recording is fire-and-forget; give the insert a moment to land. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

describe("limitsFor", () => {
  it("gives new users the beta plan", () => {
    expect(limitsFor({ plan: "beta", limitOverrides: null })).toEqual({ plan: "beta", ...PLANS.beta });
  });

  it("applies overrides on top of the plan", () => {
    const limits = limitsFor({ plan: "beta", limitOverrides: { aiCallsPerDay: 250 } });
    expect(limits.aiCallsPerDay).toBe(250);
    expect(limits.audioMinutesPerMonth).toBe(PLANS.beta.audioMinutesPerMonth);
  });

  it("ignores an unknown plan and nonsense overrides", () => {
    const limits = limitsFor({
      plan: "platinum",
      limitOverrides: { aiCallsPerDay: -5, storageBytes: Number.NaN } as never,
    });
    expect(limits).toEqual({ plan: "beta", ...PLANS.beta });
  });
});

describe("parseOverrides", () => {
  it("reads plain numbers and sizes", () => {
    expect(parseOverrides(["aiCallsPerDay=250", "storageBytes=2GB", "audioMinutesPerMonth=600"])).toEqual({
      aiCallsPerDay: 250,
      storageBytes: 2 * 1024 ** 3,
      audioMinutesPerMonth: 600,
    });
  });

  it("refuses unknown keys and non-numbers", () => {
    expect(() => parseOverrides(["notesPerDay=5"])).toThrow(/Unknown limit/);
    expect(() => parseOverrides(["aiCallsPerDay=lots"])).toThrow(/isn't a number/);
  });
});

describe("per-user overrides", () => {
  it("lets a raised tester past the plan's daily AI limit", async () => {
    const alice = await signUp(ALICE);
    await db.insert(aiDailyUsage).values({ userId: alice.id, day: today(), count: PLANS.beta.aiCallsPerDay });
    expect((await as(ALICE).post("/api/v1/ai/simplify-text").send({ text: "hi" })).status).toBe(429);

    const result = await setUserLimits(db, alice.email, { aiCallsPerDay: PLANS.beta.aiCallsPerDay + 50 });
    expect(result.limits.aiCallsPerDay).toBe(PLANS.beta.aiCallsPerDay + 50);
    expect((await as(ALICE).post("/api/v1/ai/simplify-text").send({ text: "hi" })).status).toBe(200);
  });

  it("merges new overrides and can reset them", async () => {
    const alice = await signUp(ALICE);
    await setUserLimits(db, alice.email, { aiCallsPerDay: 200 });
    const merged = await setUserLimits(db, alice.email.toUpperCase(), { storageBytes: 5 });
    expect(merged.overrides).toEqual({ aiCallsPerDay: 200, storageBytes: 5 });
    const reset = await setUserLimits(db, alice.email, null);
    expect(reset.limits).toEqual({ plan: "beta", ...PLANS.beta });
  });

  it("reports the user's own limits from /me/usage", async () => {
    const alice = await signUp(ALICE);
    await setUserLimits(db, alice.email, { audioMinutesPerMonth: 900 });
    const res = await as(ALICE).get("/api/v1/users/me/usage");
    expect(res.body).toMatchObject({
      plan: "beta",
      audio: { limitMinutes: 900 },
      ai: { dailyLimit: PLANS.beta.aiCallsPerDay },
      storage: { usedBytes: 0, limitBytes: PLANS.beta.storageBytes },
    });
  });
});

describe("usage history", () => {
  it("keeps past days' AI counts instead of sweeping them", async () => {
    const alice = await signUp(ALICE);
    await db.insert(aiDailyUsage).values({ userId: alice.id, day: "2026-01-15", count: 40 });
    await as(ALICE).post("/api/v1/ai/simplify-text").send({ text: "hi" }).expect(200);
    await settle();
    const rows = await db.select().from(aiDailyUsage).where(eq(aiDailyUsage.userId, alice.id));
    expect(rows.map((r) => r.day).sort()).toEqual(["2026-01-15", today()]);
  });

  it("records each Gemini call's tokens against the caller and route", async () => {
    const alice = await signUp(ALICE);
    await as(ALICE).post("/api/v1/ai/simplify-text").send({ text: "hi" }).expect(200);
    await settle();
    const events = await db.select().from(aiUsageEvents);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      userId: alice.id,
      feature: "POST /api/v1/ai/simplify-text",
      inputTokens: 120,
      outputTokens: 30,
      totalTokens: 170,
    });
  });

  it("attributes a job's calls once it learns its user, streams included", async () => {
    const alice = await signUp(ALICE);
    await withAiUsageScope({ db, userId: null, feature: "recording.process" }, async () => {
      setAiUsageUser(alice.id);
      const streamed = await getGeminiModel("key", undefined, ["m"]).generateContentStream("hi");
      await streamed.response;
    });
    await settle();
    const [event] = await db.select().from(aiUsageEvents);
    expect(event).toMatchObject({ userId: alice.id, feature: "recording.process", model: "m", totalTokens: 170 });
  });

  it("records nothing outside a scope", async () => {
    await getGeminiModel("key", undefined, ["m"]).generateContent("hi");
    await settle();
    expect(await db.select().from(aiUsageEvents)).toHaveLength(0);
  });

  it("keeps usage rows but unlinks them when the account is deleted", async () => {
    const alice = await signUp(ALICE);
    await as(ALICE).post("/api/v1/ai/simplify-text").send({ text: "hi" }).expect(200);
    await settle();
    await db.delete(users).where(eq(users.id, alice.id));
    const [event] = await db.select().from(aiUsageEvents);
    expect(event.userId).toBeNull();
  });

  it("summarises usage per user and per feature", async () => {
    const alice = await signUp(ALICE);
    await as(ALICE).post("/api/v1/ai/simplify-text").send({ text: "hi" }).expect(200);
    await as(ALICE).post("/api/v1/ai/simplify-text").send({ text: "again" }).expect(200);
    await settle();

    const [row] = await usageByUser(db, 7);
    expect(row).toMatchObject({ email: alice.email, aiCalls: 2, inputTokens: 240, outputTokens: 60, daysAtLimit: 0 });
    const [feature] = await usageByFeature(db, 7);
    expect(feature).toMatchObject({ feature: "POST /api/v1/ai/simplify-text", calls: 2, totalTokens: 340 });
  });
});

describe("featureName", () => {
  it("collapses ids so a route's calls group together", () => {
    expect(featureName("POST", "/api/v1/chats/sessions/0b6f7c1e-8d2a-4f7e-9c1a-2b3c4d5e6f70/reply?x=1")).toBe(
      "POST /api/v1/chats/sessions/:id/reply",
    );
    expect(featureName("GET", "/api/v1/search/semantic")).toBe("GET /api/v1/search/semantic");
  });
});
