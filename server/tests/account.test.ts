import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import {
  aiDailyUsage,
  documents,
  files,
  flashcardDecks,
  flashcards,
  notes,
  recordings,
  users,
} from "../src/db/schema/index.js";
import { MAX_AI_CALLS_PER_DAY } from "../src/middleware/ai-rate-limit.js";
import { AUDIO_LIMIT_MINUTES } from "../src/recordings/usage.js";
import { bearer, buildApp, createTestDb, fakeClerkProfiles, fakeStorage } from "./helpers.js";

const ALICE = "user_alice";
const BOB = "user_bob";

let db: Db;
let closeDb: () => Promise<void>;
let app: ReturnType<typeof buildApp>;
let storage: ReturnType<typeof fakeStorage>;

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
});
afterAll(() => closeDb?.());

beforeEach(async () => {
  await db.delete(documents);
  await db.delete(users);
  storage = fakeStorage();
  app = buildApp({ db, storage: storage.storage });
  fakeClerkProfiles.delete.mockClear();
});

const as = (user: string) => ({
  get: (path: string) => request(app).get(path).set("Authorization", bearer(user)),
  delete: (path: string) => request(app).delete(path).set("Authorization", bearer(user)),
});

/** Signs the user in once so their row exists, and returns its id. */
async function userId(clerkUserId: string) {
  const { body } = await as(clerkUserId).get("/api/v1/users/me");
  return body.id as string;
}

async function seed(uid: string, key: string) {
  await db.insert(notes).values({ userId: uid, title: "Mitosis", content: "Cells divide" });
  const [deck] = await db.insert(flashcardDecks).values({ userId: uid, title: "Cells" }).returning();
  await db.insert(flashcards).values({ userId: uid, deckId: deck.id, front: "Q", back: "A" });
  await db.insert(files).values({ userId: uid, name: "notes.pdf", type: "pdf", storageKey: `${key}.pdf` });
  await db.insert(documents).values({
    storageKey: `${key}.pdf`,
    courseId: "bio",
    text: "chunk",
    embedding: Array(768).fill(0),
  });
  await db.insert(recordings).values({
    userId: uid,
    sessionId: "s1",
    title: "Lecture",
    transcript: "hello",
    audioStorageKey: `${key}.webm`,
  });
}

describe("GET /api/v1/users/me/usage", () => {
  it("reports this month's audio and today's AI calls against their limits", async () => {
    const uid = await userId(ALICE);
    await db
      .update(users)
      .set({ monthlyUsage: { audioMinutesUsed: 42, notesCreated: 0, lastResetDate: Date.now() } })
      .where(eq(users.id, uid));
    await db.insert(aiDailyUsage).values({ userId: uid, day: new Date().toISOString().slice(0, 10), count: 7 });

    const res = await as(ALICE).get("/api/v1/users/me/usage");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      audio: { usedMinutes: 42, limitMinutes: AUDIO_LIMIT_MINUTES },
      ai: { usedToday: 7, dailyLimit: MAX_AI_CALLS_PER_DAY },
    });
    expect(res.body.audio.resetsAt).toBeGreaterThan(Date.now());
  });

  it("starts at zero for a new user", async () => {
    const res = await as(ALICE).get("/api/v1/users/me/usage");
    expect(res.body.audio.usedMinutes).toBe(0);
    expect(res.body.ai.usedToday).toBe(0);
  });
});

describe("GET /api/v1/users/me/export", () => {
  it("downloads the caller's data without internals or other users' rows", async () => {
    await seed(await userId(ALICE), "alice");
    await seed(await userId(BOB), "bob");

    const res = await as(ALICE).get("/api/v1/users/me/export");
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toMatch(/^attachment; filename="lumina-export-.*\.json"$/);
    expect(res.body.profile.email).toBe(`${ALICE}@example.test`);
    expect(res.body.notes).toHaveLength(1);
    expect(res.body.notes[0]).toMatchObject({ title: "Mitosis", content: "Cells divide" });
    expect(res.body.flashcardDecks[0].cards).toEqual([expect.objectContaining({ front: "Q", back: "A" })]);
    expect(res.body.files).toHaveLength(1);
    expect(res.body.recordings).toHaveLength(1);

    const text = JSON.stringify(res.body);
    for (const internal of ["embedding", "searchTitle", "searchContent", "storageKey", "audioStorageKey", "userId"]) {
      expect(text).not.toContain(`"${internal}"`);
    }
  });
});

describe("DELETE /api/v1/users/me", () => {
  it("refuses without the typed confirmation", async () => {
    await userId(ALICE);
    const res = await as(ALICE).delete("/api/v1/users/me").send({ confirm: "delete" });
    expect(res.status).toBe(400);
    expect(await db.select().from(users)).toHaveLength(1);
    expect(fakeClerkProfiles.delete).not.toHaveBeenCalled();
  });

  it("removes the caller's rows, bucket objects and Clerk user, leaving others alone", async () => {
    const alice = await userId(ALICE);
    const bob = await userId(BOB);
    await seed(alice, "alice");
    await seed(bob, "bob");

    const res = await as(ALICE).delete("/api/v1/users/me").send({ confirm: "DELETE" });
    expect(res.status).toBe(204);

    expect((await db.select().from(users)).map((u) => u.id)).toEqual([bob]);
    expect(await db.select().from(notes).where(eq(notes.userId, alice))).toEqual([]);
    expect((await db.select().from(documents)).map((d) => d.storageKey)).toEqual(["bob.pdf"]);
    expect(storage.mock.delete.mock.calls.map(([key]) => key).sort()).toEqual(["alice.pdf", "alice.webm"]);
    expect(fakeClerkProfiles.delete).toHaveBeenCalledWith(ALICE);
  });

  it("keeps everything when Clerk can't delete the user, so it can be retried", async () => {
    const alice = await userId(ALICE);
    await seed(alice, "alice");
    fakeClerkProfiles.delete.mockRejectedValueOnce(new Error("Clerk is down"));

    const res = await as(ALICE).delete("/api/v1/users/me").send({ confirm: "DELETE" });
    expect(res.status).toBe(500);
    expect(await db.select().from(users).where(eq(users.id, alice))).toHaveLength(1);
    expect(await db.select().from(documents)).toHaveLength(1);
    expect(storage.mock.delete).not.toHaveBeenCalled();
  });
});
