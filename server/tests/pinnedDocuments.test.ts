import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../src/db/client.js";
import { documents, files, users } from "../src/db/schema/index.js";
import { searchDocumentsByEmbedding } from "../src/search/vectorSearch.js";
import { processRecordingJob } from "../src/pipelines/recording/processRecording.js";
import { bearer, buildApp, createTestDb, fakeStorage, testEnv } from "./helpers.js";

/** Every prompt the routes sent to "Gemini", so tests can check what leaked into them. */
const prompts: string[] = [];
const VECTOR = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0));

vi.mock("@google/generative-ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@google/generative-ai")>();
  class FakeGoogleGenerativeAI {
    getGenerativeModel() {
      return {
        embedContent: async () => ({ embedding: { values: VECTOR } }),
        generateContent: async (prompt: unknown) => {
          prompts.push(JSON.stringify(prompt));
          return { response: { text: () => '{"summary":"ok","sections":[]}' } };
        },
      };
    }
  }
  return { ...actual, GoogleGenerativeAI: FakeGoogleGenerativeAI };
});

const ALICE = "user_alice";
const BOB = "user_bob";
const BOB_SECRET = "BOB-PRIVATE-CHUNK: bob's medical leave letter";
const ALICE_CHUNK = "ALICE-CHUNK: thermodynamics lecture slides";

let db: Db;
let closeDb: () => Promise<void>;
let app: ReturnType<typeof buildApp>;

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
});
afterAll(() => closeDb?.());

beforeEach(async () => {
  await db.delete(users);
  await db.delete(documents);
  prompts.length = 0;
  app = buildApp({ db, env: { ...testEnv, GEMINI_API_KEY: "fake-key" } });
});

async function userId(clerkUserId: string) {
  await request(app).get("/api/v1/users/me").set("Authorization", bearer(clerkUserId)).expect(200);
  const [row] = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId));
  return row.id;
}

async function uploadedFileWithChunk(clerkUserId: string, chunk: string) {
  const owner = await userId(clerkUserId);
  const storageKey = `users/${clerkUserId}/${crypto.randomUUID()}/notes.pdf`;
  const [file] = await db
    .insert(files)
    .values({ userId: owner, name: "notes.pdf", type: "pdf", storageKey })
    .returning();
  await db.insert(documents).values({ storageKey, courseId: "c1", text: chunk, embedding: VECTOR });
  return file;
}

async function linkFile(clerkUserId: string) {
  const owner = await userId(clerkUserId);
  const [file] = await db
    .insert(files)
    .values({ userId: owner, name: "A link", type: "link", url: "https://example.com/" })
    .returning();
  return file;
}

/** Starts a recording job grounded in the pinned file, and runs it as the worker would. */
async function generate(pinnedFileId: string) {
  const res = await request(app)
    .post("/api/v1/recordings/process")
    .set("Authorization", bearer(ALICE))
    .send({ sessionId: crypto.randomUUID(), title: "Thermo", liveTranscript: "Today we covered entropy and the second law.", pinnedFileId });
  expect(res.status).toBe(202);
  await processRecordingJob(
    { db, storage: fakeStorage().storage, keys: { gemini: "fake-key" }, log: { log() {}, warn() {}, error() {} } },
    res.body.job.id,
    { isFinalAttempt: true },
  );
}

describe("searchDocumentsByEmbedding", () => {
  it("only returns chunks from the given upload", async () => {
    const bobs = await uploadedFileWithChunk(BOB, BOB_SECRET);
    const alices = await uploadedFileWithChunk(ALICE, ALICE_CHUNK);

    const hits = await searchDocumentsByEmbedding(db, VECTOR, 10, alices.storageKey!);
    expect(hits.map((h) => h.text)).toEqual([ALICE_CHUNK]);
    expect(hits.map((h) => h.text)).not.toContain(BOB_SECRET);
    expect(bobs.storageKey).not.toBe(alices.storageKey);
  });
});

describe("recording jobs with a pinned document", () => {
  it("never puts another user's document chunks in the prompt when a link is pinned", async () => {
    await uploadedFileWithChunk(BOB, BOB_SECRET);
    const pinned = await linkFile(ALICE);

    await generate(pinned.id);
    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts.join("\n")).not.toContain("BOB-PRIVATE-CHUNK");
  });

  it("uses only the pinned upload's own chunks", async () => {
    await uploadedFileWithChunk(BOB, BOB_SECRET);
    const pinned = await uploadedFileWithChunk(ALICE, ALICE_CHUNK);

    await generate(pinned.id);
    const all = prompts.join("\n");
    expect(all).toContain("ALICE-CHUNK");
    expect(all).not.toContain("BOB-PRIVATE-CHUNK");
  });
});
