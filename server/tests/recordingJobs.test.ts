import { UnrecoverableError } from "bullmq";
import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../src/db/client.js";
import { notes, processingJobs, recordings, users } from "../src/db/schema/index.js";
import { processRecordingJob, type RecordingJobDeps } from "../src/pipelines/recording/processRecording.js";
import { bearer, buildApp, createTestDb, fakeQueue, fakeStorage, testEnv } from "./helpers.js";

type Call = "transcribe" | "enrich" | "generate" | "repair" | "fix";

/** How many times each kind of Gemini call was made. */
const calls: Record<Call, number> = { transcribe: 0, enrich: 0, generate: 0, repair: 0, fix: 0 };
/** Makes the next call of a kind throw, the way the SDK reports failures. */
const failNext: Partial<Record<Call, Error>> = {};
/** Makes the next call of a kind answer with almost-JSON, as the real model sometimes does. */
const malformedNext = new Set<Call>();
/** What "Gemini" writes as the notes draft. */
let draft: unknown;

function classify(prompt: unknown): Call {
  if (Array.isArray(prompt)) return "transcribe";
  const text = String(prompt);
  if (text.startsWith("Fix the following JSON")) return "fix";
  if (text.includes("reconstruction assistant")) return "enrich";
  if (text.includes("quality assurance") || text.startsWith("Improve shallow")) return "repair";
  return "generate";
}

vi.mock("@google/generative-ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@google/generative-ai")>();
  class FakeGoogleGenerativeAI {
    getGenerativeModel() {
      return {
        embedContent: async () => ({ embedding: { values: Array.from({ length: 768 }, () => 0.1) } }),
        generateContent: async (prompt: unknown) => {
          const kind = classify(prompt);
          calls[kind] += 1;
          const failure = failNext[kind];
          if (failure) {
            delete failNext[kind];
            throw failure;
          }
          if (malformedNext.delete(kind)) {
            return { response: { text: () => '{"summary": "Entropy" "sections": []}' } };
          }
          const text =
            kind === "transcribe"
              ? "Entropy measures disorder. The second law says it never decreases."
              : kind === "enrich"
                ? "short"
                : JSON.stringify(draft);
          return { response: { text: () => text } };
        },
      };
    }
  }
  return { ...actual, GoogleGenerativeAI: FakeGoogleGenerativeAI };
});

const ALICE = "user_alice";
const BOB = "user_bob";
const quiet = { log: () => {}, warn: () => {}, error: () => {} };

let db: Db;
let closeDb: () => Promise<void>;
let fake: ReturnType<typeof fakeStorage>;
let queue: ReturnType<typeof fakeQueue>;
let app: ReturnType<typeof buildApp>;
let deps: RecordingJobDeps;

beforeAll(async () => {
  // One model, so a failNext 503/429 is "every model busy" and reaches the
  // job's own retry instead of being absorbed by the model fallback chain.
  vi.stubEnv("GEMINI_MODELS", "gemini-test");
  ({ db, close: closeDb } = await createTestDb());
});
afterAll(() => {
  vi.unstubAllEnvs();
  return closeDb?.();
});

beforeEach(async () => {
  await db.delete(users);
  for (const key of Object.keys(calls) as Call[]) calls[key] = 0;
  for (const key of Object.keys(failNext) as Call[]) delete failNext[key];
  malformedNext.clear();
  draft = {
    title: "Entropy and the Second Law",
    summary: "Entropy and the **second law**.",
    sections: [
      { type: "heading", content: "Entropy", level: 2 },
      { type: "paragraph", content: "Entropy measures disorder in a system." },
      { type: "bullets", content: "• It never decreases\n• It is a state function" },
    ],
    actionItems: [],
    reviewQuestions: ["What is entropy?"],
    diagramNodes: [{ label: "Entropy", kind: "concept" }, "Second law"],
    diagramEdges: ["0-1: governed by"],
  };
  fake = fakeStorage();
  fake.mock.getBytes.mockResolvedValue(new Uint8Array(512));
  queue = fakeQueue();
  app = buildApp({ db, storage: fake.storage, queue, env: { ...testEnv, GEMINI_API_KEY: "fake-key" } });
  deps = { db, storage: fake.storage, keys: { gemini: "fake-key" }, log: quiet };
});

const as = (user: string) => ({
  get: (path: string) => request(app).get(path).set("Authorization", bearer(user)),
  post: (path: string) => request(app).post(path).set("Authorization", bearer(user)),
  patch: (path: string) => request(app).patch(path).set("Authorization", bearer(user)),
});

async function userId(clerkUserId: string) {
  await as(clerkUserId).get("/api/v1/users/me").expect(200);
  const [row] = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId));
  return row.id;
}

function audioKey(owner = ALICE) {
  const key = `users/${owner}/${crypto.randomUUID()}/recording.webm`;
  fake.objects.set(key, { size: 512, contentType: "audio/webm" });
  return key;
}

async function start(body: Record<string, unknown> = {}) {
  const res = await as(ALICE)
    .post("/api/v1/recordings/process")
    .send({ sessionId: crypto.randomUUID(), title: "Thermo lecture", storageKey: audioKey(), mimeType: "audio/webm", duration: 120, ...body });
  expect(res.status).toBe(202);
  return res.body as { job: { id: string; status: string }; noteId: string; recordingId: string };
}

const jobRow = async (id: string) => (await db.select().from(processingJobs).where(eq(processingJobs.id, id)))[0];
const noteRow = async (id: string) => (await db.select().from(notes).where(eq(notes.id, id)))[0];
const minutesUsed = async () =>
  (await db.select().from(users).where(eq(users.clerkUserId, ALICE)))[0].monthlyUsage?.audioMinutesUsed ?? 0;

describe("POST /api/v1/recordings/process", () => {
  it("returns at once with a queued job and a placeholder note that's locked to it", async () => {
    const { job, noteId, recordingId } = await start();
    expect(job.status).toBe("queued");
    expect(queue.enqueueRecording).toHaveBeenCalledWith(job.id, 1);
    expect(await noteRow(noteId)).toMatchObject({ content: "", generationJobId: job.id, sourceRecordingId: recordingId });
    // Nothing has been transcribed or generated yet: that's the worker's job.
    expect(calls.transcribe + calls.generate).toBe(0);
  });

  it("won't let the locked note be edited until the job is done", async () => {
    const { noteId } = await start();
    const res = await as(ALICE).patch(`/api/v1/notes/${noteId}`).send({ content: "<p>mine</p>", version: 0 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("note_generating");
  });

  it("refuses to start a second job on a note that's already generating", async () => {
    const { noteId } = await start();
    const res = await as(ALICE)
      .post("/api/v1/recordings/process")
      .send({ sessionId: "other", title: "Again", liveTranscript: "More words", targetNoteId: noteId });
    expect(res.status).toBe(409);
  });

  it("refuses someone else's audio", async () => {
    const res = await as(ALICE)
      .post("/api/v1/recordings/process")
      .send({ sessionId: "s", title: "T", storageKey: audioKey(BOB) });
    expect(res.status).toBe(404);
    expect(queue.enqueueRecording).not.toHaveBeenCalled();
  });

  it("marks the job failed and says so when Redis is unavailable", async () => {
    queue.enqueueRecording.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
    const res = await as(ALICE)
      .post("/api/v1/recordings/process")
      .send({ sessionId: "s", title: "T", liveTranscript: "Entropy never decreases." });
    expect(res.status).toBe(503);
    const [job] = await db.select().from(processingJobs);
    expect(job).toMatchObject({ status: "failed" });
  });

  it("keeps a recording that's waiting for the worker out of orphan cleanup", async () => {
    const { recordingId } = await start();
    await db.update(recordings).set({ createdAt: new Date(Date.now() - 60 * 60 * 1000) });
    await as(ALICE).post("/api/v1/recordings/cleanup-orphaned").expect(200);
    expect(await db.select().from(recordings).where(eq(recordings.id, recordingId))).toHaveLength(1);
  });
});

describe("GET /api/v1/jobs/:id", () => {
  it("shows the owner the job's progress, and nobody else", async () => {
    const { job } = await start();
    await userId(BOB);
    expect((await as(ALICE).get(`/api/v1/jobs/${job.id}`)).body).toMatchObject({ id: job.id, status: "queued" });
    expect((await as(BOB).get(`/api/v1/jobs/${job.id}`)).status).toBe(404);
  });
});

describe("processRecordingJob", () => {
  it("transcribes, generates and writes the notes into the note, then unlocks it", async () => {
    const { job, noteId, recordingId } = await start();
    await processRecordingJob(deps, job.id, { isFinalAttempt: false });

    expect(await jobRow(job.id)).toMatchObject({ status: "succeeded", progress: 100, error: null });
    const note = await noteRow(noteId);
    expect(note.generationJobId).toBeNull();
    expect(note.version).toBe(1);
    expect(note.content).toContain("<h2>Summary</h2>");
    expect(note.content).toContain("<strong>second law</strong>");
    expect(note.content).toContain("<li>It never decreases</li>");
    expect(note.content).toContain('data-type="diagram"');
    // The transcript is saved on the recording, so the session can be replayed.
    const [recording] = await db.select().from(recordings).where(eq(recordings.id, recordingId));
    expect(recording.transcript).toContain("Entropy measures disorder");
    expect(await minutesUsed()).toBe(2);
  });

  it("adds below what's already in a target note", async () => {
    const owner = await userId(ALICE);
    const [target] = await db.insert(notes).values({ userId: owner, title: "Mine", content: "<p>My own notes</p>" }).returning();
    const { job } = await start({ targetNoteId: target.id });
    await processRecordingJob(deps, job.id, { isFinalAttempt: false });
    const note = await noteRow(target.id);
    expect(note.content).toMatch(/^<p>My own notes<\/p><h2>Summary<\/h2>/);
    // A title the user typed is theirs to keep.
    expect(note.title).toBe("Mine");
  });

  it("titles a new note after what the recording covered", async () => {
    const { job, noteId } = await start({ noteTitle: "Session notes" });
    await processRecordingJob(deps, job.id, { isFinalAttempt: false });
    expect((await noteRow(noteId)).title).toBe("Entropy and the Second Law");
  });

  it("replaces a placeholder title on a target note", async () => {
    const owner = await userId(ALICE);
    const [target] = await db.insert(notes).values({ userId: owner, title: "Untitled Note", content: "" }).returning();
    const { job } = await start({ targetNoteId: target.id });
    await processRecordingJob(deps, job.id, { isFinalAttempt: false });
    expect((await noteRow(target.id)).title).toBe("Entropy and the Second Law");
  });

  it("falls back to the first heading when the model gives no title", async () => {
    draft = { ...(draft as object), title: undefined };
    const { job, noteId } = await start();
    await processRecordingJob(deps, job.id, { isFinalAttempt: false });
    expect((await noteRow(noteId)).title).toBe("Entropy");
  });

  it("resumes from its checkpoint after a transient failure, without paying for earlier stages again", async () => {
    const { job } = await start();
    failNext.generate = Object.assign(new Error("[503 Service Unavailable] The model is overloaded"), { status: 503 });

    await expect(processRecordingJob(deps, job.id, { isFinalAttempt: false })).rejects.toThrow(/overloaded/);
    const retrying = await jobRow(job.id);
    expect(retrying).toMatchObject({ status: "retrying", stage: "generate" });
    expect(retrying.error).toBe("The AI service is busy right now. Please try again in a moment.");
    expect(retrying.checkpoint.transcript).toBeTruthy();

    await processRecordingJob(deps, job.id, { isFinalAttempt: false });
    expect((await jobRow(job.id)).status).toBe("succeeded");
    expect(calls.transcribe).toBe(1);
    expect(await minutesUsed()).toBe(2);
  });

  it("has the model fix almost-JSON instead of failing the job", async () => {
    const { job, noteId } = await start();
    malformedNext.add("generate");
    await processRecordingJob(deps, job.id, { isFinalAttempt: false });
    expect((await jobRow(job.id)).status).toBe("succeeded");
    expect(calls.fix).toBe(1);
    expect((await noteRow(noteId)).content).toContain("Summary");
  });

  it("retries when even the fixed JSON is unreadable", async () => {
    const { job } = await start();
    malformedNext.add("generate");
    malformedNext.add("fix");
    await expect(processRecordingJob(deps, job.id, { isFinalAttempt: false })).rejects.toThrow(/valid JSON/);
    expect((await jobRow(job.id)).status).toBe("retrying");
  });

  it("fails for good on its last attempt", async () => {
    const { job, noteId } = await start();
    failNext.generate = Object.assign(new Error("[429 Too Many Requests]"), { status: 429 });
    await expect(processRecordingJob(deps, job.id, { isFinalAttempt: true })).rejects.toThrow();
    expect((await jobRow(job.id)).status).toBe("failed");
    // Still locked, so the note can offer Retry / Dismiss.
    expect((await noteRow(noteId)).generationJobId).toBe(job.id);
  });

  it("doesn't retry an error retrying can't fix", async () => {
    const { job } = await start();
    fake.objects.clear();
    await expect(processRecordingJob(deps, job.id, { isFinalAttempt: false })).rejects.toBeInstanceOf(UnrecoverableError);
    expect(await jobRow(job.id)).toMatchObject({ status: "failed", error: "Audio file not found in storage. It may have been deleted." });
  });

  it("falls back to the browser's live transcript when the audio can't be transcribed", async () => {
    const { job, noteId } = await start({ liveTranscript: "Entropy never decreases in an isolated system." });
    failNext.transcribe = new Error("[400 Bad Request] Unsupported audio");
    await processRecordingJob(deps, job.id, { isFinalAttempt: false });
    expect((await jobRow(job.id)).status).toBe("succeeded");
    expect((await noteRow(noteId)).content).toContain("Summary");
    expect(await minutesUsed()).toBe(0);
  });

  it("strips anything the editor wouldn't allow from the model's output", async () => {
    draft = {
      summary: "Fine <script>alert(1)</script>",
      sections: [{ type: "paragraph", content: '[click](javascript:alert(1)) <img src=x onerror="alert(1)">' }],
    };
    const { job, noteId } = await start();
    await processRecordingJob(deps, job.id, { isFinalAttempt: false });
    const { content } = await noteRow(noteId);
    expect(content).not.toMatch(/<script|javascript:|onerror|<img/i);
  });
});

describe("retrying and dismissing a failed job", () => {
  async function failedJob() {
    const started = await start();
    failNext.generate = new Error("Something permanent");
    await processRecordingJob(deps, started.job.id, { isFinalAttempt: false }).catch(() => {});
    expect((await jobRow(started.job.id)).status).toBe("failed");
    return started;
  }

  it("retry queues a new run that resumes from the checkpoint", async () => {
    const { job } = await failedJob();
    const res = await as(ALICE).post(`/api/v1/jobs/${job.id}/retry`);
    expect(res.status).toBe(202);
    expect(res.body.status).toBe("queued");
    expect(queue.enqueueRecording).toHaveBeenLastCalledWith(job.id, 2);

    await processRecordingJob(deps, job.id, { isFinalAttempt: false });
    expect((await jobRow(job.id)).status).toBe("succeeded");
    expect(calls.transcribe).toBe(1);
  });

  it("only retries failed jobs", async () => {
    const { job } = await start();
    expect((await as(ALICE).post(`/api/v1/jobs/${job.id}/retry`)).status).toBe(409);
  });

  it("dismiss unlocks the note so it can be edited again", async () => {
    const { job, noteId } = await failedJob();
    expect((await as(ALICE).post(`/api/v1/jobs/${job.id}/dismiss`)).status).toBe(204);
    expect((await noteRow(noteId)).generationJobId).toBeNull();
  });
});
