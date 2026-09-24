import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { users } from "../src/db/schema/index.js";
import { bearer, buildApp, createTestDb, fakeStorage } from "./helpers.js";

const ALICE = "user_alice";
const BOB = "user_bob";
const DAY = 86_400_000;

let db: Db;
let closeDb: () => Promise<void>;
let app: ReturnType<typeof buildApp>;

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
});
afterAll(() => closeDb?.());

beforeEach(async () => {
  await db.delete(users);
  app = buildApp({ storage: fakeStorage().storage, db });
});

const as = (user: string) => ({
  get: (path: string) => request(app).get(path).set("Authorization", bearer(user)),
  post: (path: string) => request(app).post(path).set("Authorization", bearer(user)),
});

describe("GET /api/v1/home", () => {
  it("builds the plan, runway and course pulse from the user's own data", async () => {
    const courseId = (await as(ALICE).post("/api/v1/courses").send({ name: "Databases", code: "DATA6211" })).body
      .id as string;

    const deckId = (
      await as(ALICE)
        .post("/api/v1/flashcards/decks")
        .send({ title: "Joins", courseId, cards: [{ front: "LEFT JOIN", back: "keeps left rows" }, { front: "3NF", back: "…" }] })
    ).body.id as string;
    const [card] = (await as(ALICE).get(`/api/v1/flashcards/decks/${deckId}/cards`)).body;
    await as(ALICE).post(`/api/v1/flashcards/cards/${card.id}/schedule`).send({ rating: "hard" });

    const quizId = (
      await as(ALICE)
        .post("/api/v1/quizzes/decks")
        .send({ title: "Normalisation", courseId, questions: [0, 1, 2, 3].map((n) => ({ question: `Q${n}`, options: ["a", "b", "c", "d"], correctAnswer: 0 })) })
    ).body.id as string;
    await as(ALICE).post(`/api/v1/quizzes/decks/${quizId}/results`).send({ score: 1, totalQuestions: 4, answers: [0, 1, 1, 1] });

    await as(ALICE).post("/api/v1/deadlines").send({ title: "Class test 2", dueAt: Date.now() + 3 * DAY, kind: "exam", courseId });
    await as(ALICE).post("/api/v1/deadlines").send({ title: "Reflection", dueAt: Date.now() - DAY, kind: "assignment", courseId });
    // Someone else's data never shows up.
    await as(BOB).post("/api/v1/deadlines").send({ title: "Bob's essay", dueAt: Date.now() + DAY, kind: "assignment" });

    const res = await as(ALICE).get(`/api/v1/home?tzOffsetMinutes=${new Date().getTimezoneOffset()}`);
    expect(res.status).toBe(200);

    expect(res.body.plan.map((p: { kind: string }) => p.kind)).toEqual(["overdue", "deadline", "weak-quiz", "review"]);
    expect(res.body.plan[3]).toMatchObject({ dueCount: 1, byCourse: [{ courseId, count: 1 }], urgentCourseId: courseId });
    expect(res.body.plan[2]).toMatchObject({ quizDeckId: quizId, scorePercent: 25 });

    expect(res.body.runway.deadlines).toEqual([expect.objectContaining({ title: "Class test 2", courseId })]);
    expect(res.body.runway.overdue).toEqual([expect.objectContaining({ title: "Reflection" })]);

    const [pulse] = res.body.courses;
    expect(pulse).toMatchObject({ courseId, status: "behind", cardCount: 2, dueToday: 1, overdueCount: 1 });
    expect(pulse.lastStudiedAt).toEqual(expect.any(Number));
    // One card of two is due and neither is mastered; the quiz scored 25%.
    expect(pulse.readiness).toBeCloseTo(0.4 * 0.25);
  });

  it("returns an empty summary for a new user", async () => {
    const res = await as(ALICE).get("/api/v1/home");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ plan: [], planMinutes: 0, courses: [], runway: { deadlines: [], overdue: [] } });
  });
});
