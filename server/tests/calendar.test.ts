import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import {
  flashcardDecks,
  flashcardReviewEvents,
  flashcards,
  quizDecks,
  quizResults,
  recordings,
  users,
} from "../src/db/schema/index.js";
import { bearer, buildApp, createTestDb } from "./helpers.js";

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
  app = buildApp({ db });
});

/** The users row behind a Clerk id, created by its first request. */
async function userIdOf(clerkUserId: string) {
  await as(clerkUserId).get("/api/v1/calendar/activity?startMs=0&endMs=1");
  const rows = await db.select().from(users);
  return rows.find((u) => u.clerkUserId === clerkUserId)!.id;
}

const as = (user: string) => ({
  get: (path: string) => request(app).get(path).set("Authorization", bearer(user)),
  post: (path: string) => request(app).post(path).set("Authorization", bearer(user)),
});

describe("GET /api/v1/calendar/activity", () => {
  it("returns notes and recordings created in the range", async () => {
    const note = await as(ALICE).post("/api/v1/notes").send({ title: "Day note" });
    expect(note.status).toBe(201);

    const startMs = Date.now() - 60_000;
    const endMs = Date.now() + 60_000;
    const res = await as(ALICE).get(`/api/v1/calendar/activity?startMs=${startMs}&endMs=${endMs}`);
    expect(res.status).toBe(200);
    expect(res.body.notes).toHaveLength(1);
    expect(res.body.notes[0].title).toBe("Day note");
    expect(typeof res.body.notes[0].createdAt).toBe("number");
    expect(res.body.recordings).toEqual([]);
  });

  it("leaves out transcripts and note bodies", async () => {
    await as(ALICE).post("/api/v1/notes").send({ title: "Long note", content: "x".repeat(2000) });
    const userId = await userIdOf(ALICE);
    await db.insert(recordings).values({ userId, sessionId: "s1", title: "Lecture", transcript: "words", duration: 600 });

    const res = await as(ALICE).get(`/api/v1/calendar/activity?startMs=${Date.now() - 60_000}&endMs=${Date.now() + 60_000}`);
    expect(res.status).toBe(200);
    expect(res.body.recordings).toHaveLength(1);
    expect(res.body.recordings[0]).not.toHaveProperty("transcript");
    expect(res.body.recordings[0].duration).toBe(600);
    expect(res.body.notes[0]).not.toHaveProperty("content");
  });

  it("counts reviews and quizzes per local day", async () => {
    const userId = await userIdOf(ALICE);
    const [deck] = await db.insert(flashcardDecks).values({ userId, title: "Deck" }).returning();
    const [card] = await db.insert(flashcards).values({ userId, deckId: deck!.id, front: "f", back: "b" }).returning();
    const [quiz] = await db.insert(quizDecks).values({ userId, title: "Quiz" }).returning();

    // 23:30 UTC on 1 Sep is 01:30 on 2 Sep at UTC+2 (offset -120).
    const lateUtc = Date.UTC(2026, 8, 1, 23, 30);
    const noonUtc = Date.UTC(2026, 8, 1, 12, 0);
    await db.insert(flashcardReviewEvents).values([
      { userId, deckId: deck!.id, cardId: card!.id, rating: "easy", reviewedAt: new Date(noonUtc) },
      { userId, deckId: deck!.id, cardId: card!.id, rating: "hard", reviewedAt: new Date(lateUtc) },
      { userId, deckId: deck!.id, cardId: card!.id, rating: "easy", reviewedAt: new Date(lateUtc + 60_000) },
    ]);
    await db.insert(quizResults).values({
      userId,
      deckId: quiz!.id,
      score: 3,
      totalQuestions: 5,
      answers: [0, 1, 2, 0, 1],
      completedAt: new Date(lateUtc),
    });

    const startMs = Date.UTC(2026, 7, 30);
    const endMs = Date.UTC(2026, 8, 5);
    const local = await as(ALICE).get(`/api/v1/calendar/activity?startMs=${startMs}&endMs=${endMs}&tzOffsetMinutes=-120`);
    expect(local.status).toBe(200);
    expect(local.body.study).toEqual([
      { day: "2026-09-01", reviews: 1, quizzes: 0 },
      { day: "2026-09-02", reviews: 2, quizzes: 1 },
    ]);

    const utc = await as(ALICE).get(`/api/v1/calendar/activity?startMs=${startMs}&endMs=${endMs}`);
    expect(utc.body.study).toEqual([{ day: "2026-09-01", reviews: 3, quizzes: 1 }]);
  });

  it("rejects a range longer than six weeks", async () => {
    const res = await as(ALICE).get(`/api/v1/calendar/activity?startMs=0&endMs=${60 * 24 * 60 * 60 * 1000}`);
    expect(res.status).toBe(400);
  });
});
