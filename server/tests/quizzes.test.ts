import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { quizDecks, quizQuestions, quizResults, users } from "../src/db/schema/index.js";
import { bearer, buildApp, createTestDb, fakeStorage } from "./helpers.js";

const ALICE = "user_alice";
const BOB = "user_bob";

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
  patch: (path: string) => request(app).patch(path).set("Authorization", bearer(user)),
  delete: (path: string) => request(app).delete(path).set("Authorization", bearer(user)),
});

const sampleQuestions = [
  {
    question: "What is mitosis?",
    options: ["Cell division", "Protein synthesis", "Photosynthesis", "Respiration"],
    correctAnswer: 0,
    explanation: "Mitosis produces two identical daughter cells.",
  },
  {
    question: "How many phases does mitosis have?",
    options: ["Two", "Three", "Four", "Five"],
    correctAnswer: 2,
  },
];

async function createDeck(user: string, title = "Biology quiz") {
  const res = await as(user).post("/api/v1/quizzes/decks").send({ title, questions: sampleQuestions });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

describe("POST /api/v1/quizzes/decks", () => {
  it("creates a deck with ordered questions", async () => {
    const deckId = await createDeck(ALICE);
    const questions = (await as(ALICE).get(`/api/v1/quizzes/decks/${deckId}/questions`)).body;
    expect(questions).toHaveLength(2);
    expect(questions[0]).toMatchObject({
      question: "What is mitosis?",
      options: sampleQuestions[0].options,
      correctAnswer: 0,
      position: 0,
    });
    expect(questions[1].position).toBe(1);

    const deck = (await as(ALICE).get(`/api/v1/quizzes/decks/${deckId}`)).body;
    expect(deck).toMatchObject({ title: "Biology quiz", questionCount: 2 });
  });

  it("requires exactly four options per question", async () => {
    const res = await as(ALICE)
      .post("/api/v1/quizzes/decks")
      .send({
        title: "Bad",
        questions: [{ question: "Q?", options: ["a", "b"], correctAnswer: 0 }],
      });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/quizzes/decks", () => {
  it("lists only the caller's decks", async () => {
    await createDeck(ALICE, "Alice quiz");
    await createDeck(BOB, "Bob quiz");

    const res = await as(ALICE).get("/api/v1/quizzes/decks");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Alice quiz");
  });
});

describe("PATCH /api/v1/quizzes/decks/:deckId", () => {
  it("renames a deck", async () => {
    const deckId = await createDeck(ALICE);
    expect((await as(ALICE).patch(`/api/v1/quizzes/decks/${deckId}`).send({ title: "Finals" })).status).toBe(204);
    expect((await as(ALICE).get(`/api/v1/quizzes/decks/${deckId}`)).body.title).toBe("Finals");
    expect((await as(BOB).patch(`/api/v1/quizzes/decks/${deckId}`).send({ title: "Stolen" })).status).toBe(404);
  });
});

describe("DELETE /api/v1/quizzes/decks", () => {
  it("deletes a deck and cascades questions and results", async () => {
    const deckId = await createDeck(ALICE);
    await as(ALICE)
      .post(`/api/v1/quizzes/decks/${deckId}/results`)
      .send({ score: 2, totalQuestions: 2, answers: [0, 2], tzOffsetMinutes: 0 });

    expect((await as(ALICE).delete(`/api/v1/quizzes/decks/${deckId}`)).status).toBe(204);
    expect(await db.select().from(quizQuestions)).toHaveLength(0);
    expect(await db.select().from(quizResults)).toHaveLength(0);
  });

  it("batch-deletes only owned decks", async () => {
    const aliceDeck = await createDeck(ALICE);
    const bobDeck = await createDeck(BOB);

    const res = await as(ALICE)
      .post("/api/v1/quizzes/decks/batch-delete")
      .send({ deckIds: [aliceDeck, bobDeck] });
    expect(res.body.deletedCount).toBe(1);
    expect(await db.select().from(quizDecks)).toHaveLength(1);
  });
});

describe("POST /api/v1/quizzes/decks/:deckId/results", () => {
  it("saves a result and updates lastTakenAt", async () => {
    const deckId = await createDeck(ALICE);
    const res = await as(ALICE)
      .post(`/api/v1/quizzes/decks/${deckId}/results`)
      .send({ score: 1, totalQuestions: 2, answers: [0, 1], timeSpent: 42, tzOffsetMinutes: -120 });

    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe("string");

    const deck = await db.select().from(quizDecks).where(eq(quizDecks.id, deckId));
    expect(deck[0]?.lastTakenAt).toBeTruthy();

    const latest = (await as(ALICE).get(`/api/v1/quizzes/decks/${deckId}/results/latest`)).body;
    expect(latest).toMatchObject({ score: 1, totalQuestions: 2, answers: [0, 1], timeSpent: 42 });
  });
});

describe("GET /api/v1/quizzes/decks/:deckId/results", () => {
  it("returns results newest first for the caller", async () => {
    const deckId = await createDeck(ALICE);
    await as(ALICE).post(`/api/v1/quizzes/decks/${deckId}/results`).send({ score: 1, totalQuestions: 2, answers: [0, 0] });
    await as(ALICE).post(`/api/v1/quizzes/decks/${deckId}/results`).send({ score: 2, totalQuestions: 2, answers: [0, 2] });

    const res = await as(ALICE).get(`/api/v1/quizzes/decks/${deckId}/results`);
    expect(res.body.map((r: { score: number }) => r.score)).toEqual([2, 1]);
    expect((await as(BOB).get(`/api/v1/quizzes/decks/${deckId}/results`)).body).toEqual([]);
  });
});

describe("GET /api/v1/quizzes/decks/:deckId/questions", () => {
  it("returns an empty list for another user's deck id", async () => {
    const deckId = await createDeck(ALICE);
    expect((await as(BOB).get(`/api/v1/quizzes/decks/${deckId}/questions`)).body).toEqual([]);
  });
});
