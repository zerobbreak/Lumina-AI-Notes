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
    expect(pulse).toMatchObject({
      courseId,
      status: "behind",
      cardCount: 2,
      dueToday: 1,
      overdueCount: 1,
      quizCount: 1,
      quizScore: 0.25,
    });
    // Today had a review and a quiz.
    expect(res.body.studyDays).toHaveLength(14);
    expect(res.body.studyDays[13]).toBe(true);
    expect(pulse.lastStudiedAt).toEqual(expect.any(Number));
    // One card of two is due and neither is mastered; the quiz scored 25%.
    expect(pulse.readiness).toBeCloseTo(0.4 * 0.25);
  });

  it("returns an empty summary for a new user", async () => {
    const res = await as(ALICE).get("/api/v1/home");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      plan: [],
      planMinutes: 0,
      courses: [],
      runway: { deadlines: [], overdue: [] },
      resume: null,
    });
  });

  it("offers the last opened note to pick up again, with a plain-text preview", async () => {
    const courseId = (await as(ALICE).post("/api/v1/courses").send({ name: "Databases", code: "DATA6211" })).body
      .id as string;
    await as(ALICE).post("/api/v1/notes").send({ title: "Older", content: "<p>old</p>" });
    const noteId = (
      await as(ALICE)
        .post("/api/v1/notes")
        .send({ title: "Lecture 7", content: "<h2>Joins</h2><p>A LEFT JOIN keeps&nbsp;every row</p>", courseId })
    ).body.id as string;

    const res = await as(ALICE).get("/api/v1/home");
    expect(res.body.resume).toMatchObject({
      noteId,
      title: "Lecture 7",
      preview: "Joins A LEFT JOIN keeps every row",
      courseId,
      lastAccessedAt: expect.any(Number),
    });
  });
});

describe("GET /api/v1/courses/:courseId/overview", () => {
  it("scores only that course's data and switches on exam prep when an exam is close", async () => {
    const createCourse = async (name: string) =>
      (await as(ALICE).post("/api/v1/courses").send({ name, code: name.toUpperCase() })).body.id as string;
    const courseId = await createCourse("Algorithms");
    const otherId = await createCourse("Databases");

    const deckId = (
      await as(ALICE)
        .post("/api/v1/flashcards/decks")
        .send({ title: "Heaps", courseId, cards: [{ front: "heapify", back: "O(n)" }, { front: "sift", back: "…" }] })
    ).body.id as string;
    await as(ALICE).post("/api/v1/flashcards/decks").send({ title: "Joins", courseId: otherId, cards: [{ front: "a", back: "b" }] });
    const quizId = (
      await as(ALICE)
        .post("/api/v1/quizzes/decks")
        .send({ title: "Trees", courseId, questions: [0, 1].map((n) => ({ question: `Q${n}`, options: ["a", "b", "c", "d"], correctAnswer: 0 })) })
    ).body.id as string;
    await as(ALICE).post(`/api/v1/quizzes/decks/${quizId}/results`).send({ score: 1, totalQuestions: 2, answers: [0, 1] });

    await as(ALICE).post("/api/v1/deadlines").send({ title: "Final", dueAt: Date.now() + 5 * DAY, kind: "exam", courseId });
    await as(ALICE).post("/api/v1/deadlines").send({ title: "Project", dueAt: Date.now() + 30 * DAY, kind: "assignment", courseId });
    await as(ALICE).post("/api/v1/deadlines").send({ title: "Other test", dueAt: Date.now() + DAY, kind: "exam", courseId: otherId });
    const noteId = (await as(ALICE).post("/api/v1/notes").send({ title: "Heaps lecture", courseId })).body.id as string;

    const res = await as(ALICE).get(
      `/api/v1/courses/${courseId}/overview?tzOffsetMinutes=${new Date().getTimezoneOffset()}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.pulse).toMatchObject({ courseId, cardCount: 2, quizCount: 1, quizScore: 0.5, noteCount: 1 });
    expect(res.body.upcoming.map((d: { title: string }) => d.title)).toEqual(["Final", "Project"]);
    // Both score 0.5 (an untouched deck, a 50% quiz), so title order decides.
    expect(res.body.studySets.map((s: { id: string }) => s.id)).toEqual([deckId, quizId]);
    expect(res.body.examPrep).toMatchObject({
      exam: { title: "Final" },
      coverage: { solid: 0, shaky: 1, untouched: 1 },
    });
    expect(res.body.examPrep.days.length).toBeGreaterThanOrEqual(4);
    expect(res.body.lastOpened).toMatchObject({ noteId, title: "Heaps lecture" });
  });

  it("404s for a course that isn't the caller's", async () => {
    const courseId = (await as(ALICE).post("/api/v1/courses").send({ name: "Algorithms", code: "ALG" })).body.id;
    expect((await as(BOB).get(`/api/v1/courses/${courseId}/overview`)).status).toBe(404);
  });
});
