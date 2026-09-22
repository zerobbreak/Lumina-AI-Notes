import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { flashcardDecks, flashcardReviewEvents, flashcards, users } from "../src/db/schema/index.js";
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

const sampleCards = [
  { front: "Mitosis", back: "Cell division producing two identical cells" },
  { front: "Meiosis", back: "Cell division producing four gametes" },
];

async function createDeck(user: string, title = "Biology") {
  const res = await as(user).post("/api/v1/flashcards/decks").send({ title, cards: sampleCards });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

describe("POST /api/v1/flashcards/decks", () => {
  it("creates a deck with cards and default SRS fields", async () => {
    const deckId = await createDeck(ALICE);
    const cards = (await as(ALICE).get(`/api/v1/flashcards/decks/${deckId}/cards`)).body;
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      front: "Mitosis",
      reviewCount: 0,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      position: 0,
    });
    expect(cards[1].position).toBe(1);

    const deck = (await as(ALICE).get(`/api/v1/flashcards/decks/${deckId}`)).body;
    expect(deck).toMatchObject({ title: "Biology", cardCount: 2 });
  });

  it("rejects a source note the caller does not own", async () => {
    const deckId = await createDeck(BOB);
    const res = await as(ALICE)
      .post("/api/v1/flashcards/decks")
      .send({ title: "Bad", sourceNoteId: deckId, cards: sampleCards });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/flashcards/decks", () => {
  it("lists only the caller's decks", async () => {
    await createDeck(ALICE, "Alice deck");
    await createDeck(BOB, "Bob deck");

    const res = await as(ALICE).get("/api/v1/flashcards/decks");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Alice deck");
  });
});

describe("PATCH /api/v1/flashcards/decks/:deckId", () => {
  it("renames a deck", async () => {
    const deckId = await createDeck(ALICE);
    expect((await as(ALICE).patch(`/api/v1/flashcards/decks/${deckId}`).send({ title: "Renamed" })).status).toBe(
      204,
    );
    expect((await as(ALICE).get(`/api/v1/flashcards/decks/${deckId}`)).body.title).toBe("Renamed");
    expect((await as(BOB).patch(`/api/v1/flashcards/decks/${deckId}`).send({ title: "Stolen" })).status).toBe(404);
  });
});

describe("DELETE /api/v1/flashcards/decks", () => {
  it("deletes a deck and cascades to its cards", async () => {
    const deckId = await createDeck(ALICE);
    expect((await as(ALICE).delete(`/api/v1/flashcards/decks/${deckId}`)).status).toBe(204);
    expect(await db.select().from(flashcards)).toHaveLength(0);
  });

  it("batch-deletes only owned decks", async () => {
    const aliceDeck = await createDeck(ALICE);
    const bobDeck = await createDeck(BOB);

    const res = await as(ALICE)
      .post("/api/v1/flashcards/decks/batch-delete")
      .send({ deckIds: [aliceDeck, bobDeck] });
    expect(res.body.deletedCount).toBe(1);
    expect(await db.select().from(flashcardDecks)).toHaveLength(1);
  });
});

describe("POST /api/v1/flashcards/cards/:cardId/schedule", () => {
  it("schedules the next review and records an event", async () => {
    const deckId = await createDeck(ALICE);
    const cardId = (await as(ALICE).get(`/api/v1/flashcards/decks/${deckId}/cards`)).body[0].id as string;

    const res = await as(ALICE)
      .post(`/api/v1/flashcards/cards/${cardId}/schedule`)
      .send({ rating: "medium", tzOffsetMinutes: 0 });
    expect(res.status).toBe(200);
    expect(res.body.repetitions).toBe(1);
    expect(res.body.nextReviewAt).toBeGreaterThan(Date.now());

    const events = await db.select().from(flashcardReviewEvents);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ cardId, deckId, rating: "medium" });

    const deck = await db.select().from(flashcardDecks).where(eq(flashcardDecks.id, deckId));
    expect(deck[0]?.lastStudiedAt).toBeTruthy();
  });
});

describe("GET /api/v1/flashcards/decks/:deckId/stats", () => {
  it("returns deck statistics", async () => {
    const deckId = await createDeck(ALICE);
    const res = await as(ALICE).get(`/api/v1/flashcards/decks/${deckId}/stats`);
    expect(res.body).toMatchObject({
      totalCards: 2,
      newCards: 2,
      learningCards: 0,
      reviewCards: 0,
      dueNow: 2,
    });
  });
});

describe("GET /api/v1/flashcards/summary", () => {
  it("summarizes decks and due cards for the caller", async () => {
    await createDeck(ALICE);
    const res = await as(ALICE).get("/api/v1/flashcards/summary");
    expect(res.body).toMatchObject({
      totalDecks: 1,
      totalCards: 2,
      totalDue: 2,
      decksStudiedToday: 0,
    });
  });
});

describe("POST /api/v1/flashcards/cards/:cardId/reset", () => {
  it("resets card progress", async () => {
    const deckId = await createDeck(ALICE);
    const cardId = (await as(ALICE).get(`/api/v1/flashcards/decks/${deckId}/cards`)).body[0].id as string;

    await as(ALICE).post(`/api/v1/flashcards/cards/${cardId}/schedule`).send({ rating: "easy" });
    expect((await as(ALICE).post(`/api/v1/flashcards/cards/${cardId}/reset`)).status).toBe(204);

    const card = (await as(ALICE).get(`/api/v1/flashcards/decks/${deckId}/cards`)).body[0];
    expect(card).toMatchObject({
      reviewCount: 0,
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      lastRating: null,
    });
  });
});

describe("GET /api/v1/flashcards/decks/:deckId/cards", () => {
  it("returns an empty list for another user's deck id", async () => {
    const deckId = await createDeck(ALICE);
    expect((await as(BOB).get(`/api/v1/flashcards/decks/${deckId}/cards`)).body).toEqual([]);
  });
});
