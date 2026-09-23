import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_CONCURRENT_DOCUMENTS,
  MAX_PDF_BYTES,
  runProcessDocument,
  STALE_PROCESSING_MS,
} from "../src/ai/processDocument.js";
import type { Db } from "../src/db/client.js";
import { aiDailyUsage, files, users } from "../src/db/schema/index.js";
import { MAX_AI_CALLS_PER_DAY } from "../src/middleware/ai-rate-limit.js";
import { bearer, buildApp, createTestDb, fakeStorage } from "./helpers.js";

/** How many times "Gemini" was asked to read a PDF. */
let extractions = 0;
/** Held open by tests that need runs to overlap; resolved to let them finish. */
let gate: Promise<void> = Promise.resolve();
/** When set, "Gemini" fails the way the real SDK does, with request details in the message. */
let geminiFailure: Error | null = null;

vi.mock("@google/generative-ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@google/generative-ai")>();
  class FakeGoogleGenerativeAI {
    getGenerativeModel() {
      return {
        embedContent: async () => ({ embedding: { values: Array.from({ length: 768 }, () => 0.1) } }),
        generateContent: async () => {
          extractions += 1;
          await gate;
          if (geminiFailure) throw geminiFailure;
          return {
            response: {
              text: () => '{"extractedText":"Entropy always increases.","summary":"On entropy.","keyTopics":["entropy"]}',
            },
          };
        },
      };
    }
  }
  return { ...actual, GoogleGenerativeAI: FakeGoogleGenerativeAI };
});

const ALICE = "user_alice";
const BOB = "user_bob";

let db: Db;
let closeDb: () => Promise<void>;
let fake: ReturnType<typeof fakeStorage>;
let app: ReturnType<typeof buildApp>;

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
});
afterAll(() => closeDb?.());

beforeEach(async () => {
  await db.delete(users);
  extractions = 0;
  gate = Promise.resolve();
  geminiFailure = null;
  fake = fakeStorage();
  fake.mock.getBytes.mockResolvedValue(new Uint8Array(1024));
  app = buildApp({ storage: fake.storage, db });
});

const as = (user: string) => ({
  get: (path: string) => request(app).get(path).set("Authorization", bearer(user)),
  post: (path: string) => request(app).post(path).set("Authorization", bearer(user)),
});

async function userId(clerkUserId: string) {
  await request(app).get("/api/v1/users/me").set("Authorization", bearer(clerkUserId)).expect(200);
  const [row] = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId));
  return row.id;
}

/** A PDF row already in the bucket, in whatever processing state the test needs. */
async function pdf(owner: string, patch: Partial<typeof files.$inferInsert> = {}, size = 1024) {
  const storageKey = `users/${owner}/${crypto.randomUUID()}/notes.pdf`;
  fake.objects.set(storageKey, { size, contentType: "application/pdf" });
  const [file] = await db
    .insert(files)
    .values({ userId: await userId(owner), name: "notes.pdf", type: "pdf", storageKey, processingStatus: "pending", ...patch })
    .returning();
  return file;
}

const statusOf = async (fileId: string) => (await db.select().from(files).where(eq(files.id, fileId)))[0];

/** Holds every Gemini call open until the returned function is called. */
function holdGemini() {
  let release!: () => void;
  gate = new Promise((resolve) => (release = resolve));
  return release;
}

describe("runProcessDocument", () => {
  it("processes a pending file once, even when asked to several times at once", async () => {
    const file = await pdf(ALICE);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => runProcessDocument(db, fake.storage, file.id, file.userId, "key")),
    );
    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(extractions).toBe(1);
    expect(fake.mock.getBytes).toHaveBeenCalledTimes(1);
    expect(await statusOf(file.id)).toMatchObject({ processingStatus: "done", summary: "On entropy." });
  });

  it("leaves a file that's already processing alone", async () => {
    const file = await pdf(ALICE, { processingStatus: "processing", progressPercent: 40 });
    const result = await runProcessDocument(db, fake.storage, file.id, file.userId, "key");
    expect(result).toEqual({ success: false, error: "File is not waiting to be processed" });
    expect(extractions).toBe(0);
    // Not flipped to "error" underneath the run that owns it.
    expect(await statusOf(file.id)).toMatchObject({ processingStatus: "processing", progressPercent: 40 });
  });

  it("won't process someone else's file", async () => {
    const file = await pdf(ALICE);
    const bob = await userId(BOB);
    const result = await runProcessDocument(db, fake.storage, file.id, bob, "key");
    expect(result.success).toBe(false);
    expect(extractions).toBe(0);
    expect((await statusOf(file.id)).processingStatus).toBe("pending");
  });

  it("refuses a PDF too big for Gemini without reading it into memory", async () => {
    const file = await pdf(ALICE, {}, MAX_PDF_BYTES + 1);
    const result = await runProcessDocument(db, fake.storage, file.id, file.userId, "key");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/too large/);
    expect(fake.mock.getBytes).not.toHaveBeenCalled();
    expect(extractions).toBe(0);
    expect((await statusOf(file.id)).processingStatus).toBe("error");
  });

  it(`runs at most ${MAX_CONCURRENT_DOCUMENTS} at once and leaves the rest pending for later`, async () => {
    const release = holdGemini();
    const batch = await Promise.all(Array.from({ length: MAX_CONCURRENT_DOCUMENTS + 2 }, () => pdf(ALICE)));
    const runs = batch.map((f) => runProcessDocument(db, fake.storage, f.id, f.userId, "key"));

    await vi.waitFor(() => expect(extractions).toBe(MAX_CONCURRENT_DOCUMENTS));
    release();
    const results = await Promise.all(runs);

    expect(results.filter((r) => r.success)).toHaveLength(MAX_CONCURRENT_DOCUMENTS);
    expect(fake.mock.getBytes).toHaveBeenCalledTimes(MAX_CONCURRENT_DOCUMENTS);
    const statuses = await Promise.all(batch.map((f) => statusOf(f.id)));
    expect(statuses.filter((f) => f.processingStatus === "pending")).toHaveLength(2);

    // Once a slot frees up, the leftovers go through.
    const leftover = statuses.find((f) => f.processingStatus === "pending")!;
    expect((await runProcessDocument(db, fake.storage, leftover.id, leftover.userId, "key")).success).toBe(true);
  });
});

describe("POST /api/v1/files/:id/retry", () => {
  it("refuses while a run is in progress", async () => {
    const file = await pdf(ALICE, { processingStatus: "processing", processingStartedAt: new Date() });
    const res = await as(ALICE).post(`/api/v1/files/${file.id}/retry`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("already_processing");
    expect((await statusOf(file.id)).processingStatus).toBe("processing");
  });

  it("allows retrying a run that died mid-way", async () => {
    const file = await pdf(ALICE, {
      processingStatus: "processing",
      processingStartedAt: new Date(Date.now() - STALE_PROCESSING_MS - 1000),
    });
    expect((await as(ALICE).post(`/api/v1/files/${file.id}/retry`)).status).toBe(204);
    expect((await statusOf(file.id)).processingStatus).toBe("pending");
  });

  it("counts against the AI rate limit", async () => {
    const file = await pdf(ALICE, { processingStatus: "error" });
    for (let i = 0; i < 20; i++) {
      await db.update(files).set({ processingStatus: "error" }).where(eq(files.id, file.id));
      expect((await as(ALICE).post(`/api/v1/files/${file.id}/retry`)).status).toBe(204);
    }
    const blocked = await as(ALICE).post(`/api/v1/files/${file.id}/retry`);
    expect(blocked.status).toBe(429);
  });
});

describe("POST /api/v1/files", () => {
  it("won't record a PDF (and start a Gemini run) once the day's AI quota is spent", async () => {
    const owner = await userId(ALICE);
    await db.insert(aiDailyUsage).values({
      userId: owner,
      day: new Date().toISOString().slice(0, 10),
      count: MAX_AI_CALLS_PER_DAY,
    });
    const storageKey = `users/${ALICE}/${crypto.randomUUID()}/notes.pdf`;
    fake.objects.set(storageKey, { size: 1024, contentType: "application/pdf" });

    const res = await as(ALICE).post("/api/v1/files").send({ name: "notes.pdf", type: "pdf", storageKey });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("daily_limit_reached");
    expect(await db.select().from(files)).toHaveLength(0);

    // Links don't touch Gemini, so they still work.
    const link = await as(ALICE).post("/api/v1/files").send({ name: "Wiki", type: "link", url: "https://example.com" });
    expect(link.status).toBe(201);
  });
});

describe("error messages", () => {
  it("stores a generic message, not the SDK's, when Gemini fails", async () => {
    geminiFailure = new Error(
      "[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: [400 Bad Request] project 1234567 billing disabled",
    );
    const file = await pdf(ALICE);
    const result = await runProcessDocument(db, fake.storage, file.id, file.userId, "key");
    expect(result).toEqual({ success: false, error: "Processing failed" });
    expect((await statusOf(file.id)).errorMessage).toBe("Processing failed");
  });

  it("keeps messages written for users", async () => {
    const file = await pdf(ALICE, {}, MAX_PDF_BYTES + 1);
    const result = await runProcessDocument(db, fake.storage, file.id, file.userId, "key");
    expect(result.error).toMatch(/^PDF is too large to process/);
  });

  it("turns a Gemini quota error into a friendly try-again", async () => {
    geminiFailure = new Error("[429 Too Many Requests] Resource has been exhausted (e.g. check quota).");
    const file = await pdf(ALICE);
    const result = await runProcessDocument(db, fake.storage, file.id, file.userId, "key");
    expect(result.error).toBe("The AI service is busy right now. Please try again in a moment.");
  });
});

describe("processing queue", () => {
  it("reports queue positions without rewriting anyone's rows", async () => {
    const bobs = await pdf(BOB);
    await db.update(files).set({ queuePosition: 99 }).where(eq(files.id, bobs.id));
    const mine = await pdf(ALICE);

    const res = await as(ALICE).get("/api/v1/files/pending");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject([{ id: mine.id, queuePosition: 2 }]);
    // Bob's row is only the worker's to renumber.
    expect((await statusOf(bobs.id)).queuePosition).toBe(99);
  });

  it("no longer exposes a route any user can use to renumber the whole queue", async () => {
    expect((await as(ALICE).post("/api/v1/ai/recompute-file-queue")).status).toBe(404);
  });
});
