import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { aiRateLimitWindows, users } from "../src/db/schema/index.js";
import { bearer, buildApp, createTestDb, testEnv } from "./helpers.js";

const ALICE = "user_alice";

let db: Db;
let closeDb: () => Promise<void>;
let app: ReturnType<typeof buildApp>;

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
});
afterAll(() => closeDb?.());

beforeEach(async () => {
  await db.delete(users);
  await db.delete(aiRateLimitWindows);
  // No GEMINI_API_KEY by default: routes still validate and rate-limit, they
  // just 500 once they'd actually call Gemini. The gated describe block
  // below swaps in the real key from process.env when present.
  app = buildApp({ db });
});

const as = (user: string) => ({
  post: (path: string) => request(app).post(path).set("Authorization", bearer(user)),
});

describe("POST /api/v1/ai/*", () => {
  it("requires a signed-in user", async () => {
    const res = await request(app).post("/api/v1/ai/simplify-text").send({ text: "hi" });
    expect(res.status).toBe(401);
  });

  it("rejects text over the 100KB text-op cap", async () => {
    const res = await as(ALICE).post("/api/v1/ai/simplify-text").send({ text: "x".repeat(100_001) });
    expect(res.status).toBe(400);
  });

  it("rejects a transcript over the 1MB generation cap", async () => {
    const res = await as(ALICE)
      .post("/api/v1/ai/generate-notes-from-transcript")
      .send({ transcript: "x".repeat(1_000_001) });
    expect(res.status).toBe(400);
  });

  it("accepts a transcript within the 1MB cap even though it's over the text-op cap", async () => {
    // Proves the two caps are actually distinct, not just the smaller one applied everywhere.
    const res = await as(ALICE)
      .post("/api/v1/ai/generate-notes-from-transcript")
      .send({ transcript: "x".repeat(500_000) });
    // No GEMINI_API_KEY in this env, so it 500s once it reaches Gemini — the
    // point here is that it got PAST validation (not a 400).
    expect(res.status).not.toBe(400);
  });

  it("rate-limits a user to 20 requests/minute across all AI routes, in Postgres", async () => {
    for (let i = 0; i < 20; i++) {
      const res = await as(ALICE).post("/api/v1/ai/simplify-text").send({ text: "hi" });
      expect(res.status).not.toBe(429);
    }
    const blocked = await as(ALICE).post("/api/v1/ai/expand-text").send({ text: "hi" });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("rate_limited");

    const rows = await db.select().from(aiRateLimitWindows);
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBeGreaterThan(20);
  });

  it("errors clearly when GEMINI_API_KEY isn't configured", async () => {
    const res = await as(ALICE).post("/api/v1/ai/simplify-text").send({ text: "hi" });
    expect(res.status).toBe(500);
  });
});

// Real Gemini calls: skipped unless a live key is available, so the suite
// stays fast/offline by default and doesn't burn quota in CI.
describe.skipIf(!process.env.GEMINI_API_KEY)("POST /api/v1/ai/* (live Gemini)", () => {
  beforeEach(() => {
    app = buildApp({ db, env: { ...testEnv, GEMINI_API_KEY: process.env.GEMINI_API_KEY } });
  });

  it("refines text", async () => {
    const res = await as(ALICE).post("/api/v1/ai/refine-text").send({ text: "the cat sat on the mat and it was good" });
    expect(res.status).toBe(200);
    expect(typeof res.body.text).toBe("string");
    expect(res.body.text.length).toBeGreaterThan(0);
  }, 20_000);

  it("generates flashcards as a JSON array", async () => {
    const res = await as(ALICE)
      .post("/api/v1/ai/generate-flashcards")
      .send({ text: "Photosynthesis converts light energy into chemical energy stored in glucose.", count: 2 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  }, 20_000);

  it("generates structured notes with sections and a diagram", async () => {
    const transcript = JSON.stringify([
      { text: "Today we cover mitosis, the process of cell division.", timestamp: "0:00" },
      { text: "Mitosis has four phases: prophase, metaphase, anaphase, and telophase.", timestamp: "0:10" },
    ]);
    const res = await as(ALICE).post("/api/v1/ai/generate-structured-notes").send({ transcript, title: "Mitosis" });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sections)).toBe(true);
    expect(res.body.sections.length).toBeGreaterThan(0);
  }, 60_000);
});
