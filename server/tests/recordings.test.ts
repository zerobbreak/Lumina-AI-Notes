import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { recordings, users } from "../src/db/schema/index.js";
import { AUDIO_LIMIT_MINUTES } from "../src/recordings/usage.js";
import { bearer, buildApp, createTestDb, fakeStorage } from "./helpers.js";

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
  fake = fakeStorage();
  app = buildApp({ storage: fake.storage, db });
});

const as = (user: string) => ({
  get: (path: string) => request(app).get(path).set("Authorization", bearer(user)),
  post: (path: string) => request(app).post(path).set("Authorization", bearer(user)),
  put: (path: string) => request(app).put(path).set("Authorization", bearer(user)),
  patch: (path: string) => request(app).patch(path).set("Authorization", bearer(user)),
  delete: (path: string) => request(app).delete(path).set("Authorization", bearer(user)),
});

const aliceId = async () => (await as(ALICE).get("/api/v1/auth/session")).body.user.id as string;

async function uploadAudio(user: string, filename = "lecture.wav") {
  const signed = await as(user)
    .post("/api/v1/uploads")
    .send({ filename, contentType: "audio/wav", size: 4096 });
  expect(signed.status).toBe(201);
  fake.objects.set(signed.body.key, { size: 4096, contentType: "audio/wav" });
  return signed.body.key as string;
}

describe("GET /api/v1/recordings/audio-limit", () => {
  it("reports remaining minutes for a new user", async () => {
    const res = await as(ALICE).get("/api/v1/recordings/audio-limit");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      allowed: true,
      remaining: AUDIO_LIMIT_MINUTES,
      used: 0,
      limit: AUDIO_LIMIT_MINUTES,
    });
  });

  it("rejects when estimated minutes exceed remaining quota", async () => {
    const userId = await aliceId();
    await db
      .update(users)
      .set({
        monthlyUsage: {
          audioMinutesUsed: AUDIO_LIMIT_MINUTES - 1,
          notesCreated: 0,
          lastResetDate: Date.now(),
        },
      })
      .where(eq(users.id, userId));

    const res = await as(ALICE).get("/api/v1/recordings/audio-limit?estimatedMinutes=2");
    expect(res.body.allowed).toBe(false);
    expect(res.body.error).toMatch(/1\.0 minutes remaining/);
  });
});

describe("POST /api/v1/recordings", () => {
  it("saves a live recording and tracks audio usage", async () => {
    const res = await as(ALICE)
      .post("/api/v1/recordings")
      .send({
        sessionId: "sess-1",
        title: "Biology lecture",
        transcript: "Cells divide by mitosis.",
        duration: 120,
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      sessionId: "sess-1",
      title: "Biology lecture",
      transcript: "Cells divide by mitosis.",
      duration: 120,
    });
    expect(typeof res.body.id).toBe("string");
    expect(typeof res.body.createdAt).toBe("number");

    const limit = await as(ALICE).get("/api/v1/recordings/audio-limit");
    expect(limit.body.used).toBeCloseTo(2, 5);
  });

  it("returns 403 when the monthly audio limit would be exceeded", async () => {
    const userId = await aliceId();
    await db
      .update(users)
      .set({
        monthlyUsage: {
          audioMinutesUsed: AUDIO_LIMIT_MINUTES,
          notesCreated: 0,
          lastResetDate: Date.now(),
        },
      })
      .where(eq(users.id, userId));

    const res = await as(ALICE)
      .post("/api/v1/recordings")
      .send({ sessionId: "sess-x", title: "Too long", transcript: "...", duration: 60 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("audio_limit_exceeded");
  });
});

describe("PUT /api/v1/recordings/draft", () => {
  it("creates then updates a draft by sessionId without charging usage", async () => {
    let res = await as(ALICE)
      .put("/api/v1/recordings/draft")
      .send({ sessionId: "draft-1", title: "Draft", transcript: "Part one", duration: 600 });
    expect(res.status).toBe(201);
    const id = res.body.id as string;

    res = await as(ALICE)
      .put("/api/v1/recordings/draft")
      .send({ sessionId: "draft-1", title: "Draft updated", transcript: "Part one and two" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id, title: "Draft updated", transcript: "Part one and two" });

    const limit = await as(ALICE).get("/api/v1/recordings/audio-limit");
    expect(limit.body.used).toBe(0);
  });
});

describe("POST /api/v1/recordings/uploaded", () => {
  it("stores an uploaded audio file and returns a signed playback URL", async () => {
    const storageKey = await uploadAudio(ALICE);
    const res = await as(ALICE)
      .post("/api/v1/recordings/uploaded")
      .send({ title: "Uploaded lecture", storageKey, duration: 180 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "Uploaded lecture",
      transcript: "",
      duration: 180,
    });
    expect(res.body.audioUrl).toContain(storageKey);
    expect(res.body.audioStorageKey).toBeUndefined();
  });

  it("rejects storage keys that do not belong to the caller", async () => {
    const aliceKey = await uploadAudio(ALICE);
    const res = await as(BOB)
      .post("/api/v1/recordings/uploaded")
      .send({ title: "Stolen", storageKey: aliceKey, duration: 60 });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/v1/recordings", () => {
  it("lists the caller's recordings newest first", async () => {
    await as(ALICE).post("/api/v1/recordings").send({
      sessionId: "a",
      title: "Older",
      transcript: "one",
    });
    await as(ALICE).post("/api/v1/recordings").send({
      sessionId: "b",
      title: "Newer",
      transcript: "two",
    });

    const res = await as(ALICE).get("/api/v1/recordings");
    expect(res.body.map((r: { title: string }) => r.title)).toEqual(["Newer", "Older"]);
  });

  it("does not leak another user's recordings", async () => {
    await as(ALICE).post("/api/v1/recordings").send({
      sessionId: "a",
      title: "Alice only",
      transcript: "secret",
    });
    expect((await as(BOB).get("/api/v1/recordings")).body).toEqual([]);
  });
});

describe("PATCH /api/v1/recordings/:id/transcript", () => {
  it("updates the transcript for the owner", async () => {
    const created = await as(ALICE)
      .post("/api/v1/recordings/uploaded")
      .send({ title: "Pending", storageKey: await uploadAudio(ALICE) });
    const id = created.body.id as string;

    expect((await as(ALICE).patch(`/api/v1/recordings/${id}/transcript`).send({ transcript: "Done." })).status).toBe(
      204,
    );
    expect((await as(ALICE).get(`/api/v1/recordings/${id}`)).body.transcript).toBe("Done.");
    expect((await as(BOB).patch(`/api/v1/recordings/${id}/transcript`).send({ transcript: "Nope" })).status).toBe(404);
  });
});

describe("DELETE /api/v1/recordings/:id", () => {
  it("deletes the row and removes the audio object from storage", async () => {
    const storageKey = await uploadAudio(ALICE);
    const created = await as(ALICE)
      .post("/api/v1/recordings/uploaded")
      .send({ title: "Remove me", storageKey });
    const id = created.body.id as string;

    expect((await as(ALICE).delete(`/api/v1/recordings/${id}`)).status).toBe(204);
    expect(await db.select().from(recordings)).toHaveLength(0);
    expect(fake.mock.delete).toHaveBeenCalledWith(storageKey);
  });
});

describe("POST /api/v1/recordings/cleanup-orphaned", () => {
  it("deletes old empty transcripts but keeps fresh drafts", async () => {
    const userId = await aliceId();
    const old = new Date(Date.now() - 11 * 60 * 1000);
    await db.insert(recordings).values([
      {
        userId,
        sessionId: "old-empty",
        title: "Stale",
        transcript: "",
        createdAt: old,
      },
      {
        userId,
        sessionId: "fresh-empty",
        title: "Active",
        transcript: "   ",
        createdAt: new Date(),
      },
      {
        userId,
        sessionId: "old-with-text",
        title: "Keep",
        transcript: "Saved",
        createdAt: old,
      },
    ]);

    const res = await as(ALICE).post("/api/v1/recordings/cleanup-orphaned");
    expect(res.body.deletedCount).toBe(1);

    const remaining = await db.select().from(recordings);
    expect(remaining.map((r) => r.sessionId).sort()).toEqual(["fresh-empty", "old-with-text"]);
  });
});
