import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { users } from "../src/db/schema/index.js";
import { bearer, buildApp, createTestDb, fakeStorage } from "./helpers.js";

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
  app = buildApp({ storage: fakeStorage().storage, db });
});

const as = (user: string) => ({
  get: (path: string) => request(app).get(path).set("Authorization", bearer(user)),
  post: (path: string) => request(app).post(path).set("Authorization", bearer(user)),
});

const tzOffsetMinutes = new Date().getTimezoneOffset();

describe("analytics", () => {
  it("aggregates daily study activity from reviews, quizzes, and recordings", async () => {
    const deckRes = await as(ALICE)
      .post("/api/v1/flashcards/decks")
      .send({
        title: "Bio",
        cards: [{ front: "A", back: "B" }],
      });
    const deckId = deckRes.body.id as string;
    const cards = (await as(ALICE).get(`/api/v1/flashcards/decks/${deckId}/cards`)).body;
    const cardId = cards[0].id as string;

    await as(ALICE).post(`/api/v1/flashcards/cards/${cardId}/schedule`).send({ rating: "medium" });

    const quizDeck = await as(ALICE)
      .post("/api/v1/quizzes/decks")
      .send({
        title: "Quiz",
        questions: [
          {
            question: "Q1",
            options: ["a", "b", "c", "d"],
            correctAnswer: 0,
          },
        ],
      });
    await as(ALICE).post(`/api/v1/quizzes/decks/${quizDeck.body.id}/results`).send({
      score: 1,
      totalQuestions: 1,
      answers: [0],
      timeSpent: 30,
    });

    const start = Date.now() - 86_400_000;
    const end = Date.now() + 86_400_000;
    const res = await as(ALICE).get(
      `/api/v1/analytics/daily-study-activity?start=${start}&end=${end}&tzOffsetMinutes=${tzOffsetMinutes}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.reduce((sum: number, d: { count: number }) => sum + d.count, 0)).toBeGreaterThanOrEqual(2);
  });

  it("returns burnout streak stats", async () => {
    const deckRes = await as(ALICE)
      .post("/api/v1/flashcards/decks")
      .send({
        title: "Bio",
        cards: [{ front: "A", back: "B" }],
      });
    const deckId = deckRes.body.id as string;
    const cardId = (await as(ALICE).get(`/api/v1/flashcards/decks/${deckId}/cards`)).body[0].id as string;
    await as(ALICE).post(`/api/v1/flashcards/cards/${cardId}/schedule`).send({ rating: "easy" });

    const res = await as(ALICE).get(`/api/v1/analytics/burnout-stats?tzOffsetMinutes=${tzOffsetMinutes}`);
    expect(res.status).toBe(200);
    expect(res.body.streakDays).toBeGreaterThanOrEqual(1);
    expect(["low", "medium", "high"]).toContain(res.body.level);
  });

  it("returns quiz deck performance and flashcard weak topics", async () => {
    const flashDeckId = (
      await as(ALICE).post("/api/v1/flashcards/decks").send({
        title: "Cards",
        cards: [{ front: "Hard topic", back: "Answer" }],
      })
    ).body.id as string;
    const cardId = (await as(ALICE).get(`/api/v1/flashcards/decks/${flashDeckId}/cards`)).body[0].id as string;
    await as(ALICE).post(`/api/v1/flashcards/cards/${cardId}/schedule`).send({ rating: "hard" });

    const weak = await as(ALICE).get(`/api/v1/analytics/flashcard-decks/${flashDeckId}/weak-topics`);
    expect(weak.body[0]).toMatchObject({ cardId, topic: "Hard topic" });

    const readiness = await as(ALICE).get(
      `/api/v1/analytics/flashcard-decks/${flashDeckId}/readiness-forecast`,
    );
    expect(readiness.body.cardsRemaining).toBeGreaterThanOrEqual(1);

    const quizDeckId = (
      await as(ALICE).post("/api/v1/quizzes/decks").send({
        title: "Quiz deck",
        questions: [{ question: "Q", options: ["a", "b", "c", "d"], correctAnswer: 0 }],
      })
    ).body.id as string;
    await as(ALICE).post(`/api/v1/quizzes/decks/${quizDeckId}/results`).send({
      score: 1,
      totalQuestions: 1,
      answers: [0],
    });

    const perf = await as(ALICE).get(`/api/v1/analytics/quiz-decks/${quizDeckId}/performance`);
    expect(perf.body).toEqual([{ date: expect.any(Number), scorePercent: 100 }]);
  });
});
