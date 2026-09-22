import { and, asc, desc, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import {
  assertOwnedNote,
  findOwnedCard,
  findOwnedDeck,
  getEndOfDay,
  getStartOfDay,
  requireOwnedCard,
  requireOwnedDeck,
} from "../flashcards/helpers.js";
import { DEFAULT_EASE_FACTOR, scheduleNextReviewFromRating } from "../flashcards/spacedRepetition.js";
import type { Db } from "../db/client.js";
import {
  flashcardDecks,
  flashcardReviewEvents,
  flashcardReviewQueues,
  flashcards,
} from "../db/schema/index.js";
import { HttpError } from "../middleware/errors.js";
import { currentUser } from "../middleware/user.js";
import { parse } from "./validation.js";

const rowId = z.string().min(1).max(200);
const title = z.string().trim().min(1).max(500);

const cardInput = z.object({
  front: z.string().trim().min(1).max(10_000),
  back: z.string().trim().min(1).max(10_000),
});

const createDeckBody = z.object({
  title,
  sourceNoteId: rowId.optional(),
  courseId: rowId.optional(),
  cards: z.array(cardInput).min(1).max(500),
});

const immediateDeckBody = z.object({
  title,
  sourceFileName: z.string().trim().max(500).optional(),
  courseId: rowId.optional(),
  cards: z.array(cardInput).min(1).max(500),
});

const renameBody = z.object({ title });
const deleteManyBody = z.object({ deckIds: z.array(rowId).min(1).max(100) });

const updateCardBody = z
  .object({
    front: z.string().trim().min(1).max(10_000),
    back: z.string().trim().min(1).max(10_000),
    difficulty: z.number().finite(),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: "Send at least one field to update" });

const reviewBody = z.object({
  quality: z.number().int().min(0).max(5),
  easeFactor: z.number().finite(),
  interval: z.number().finite().min(0),
  repetitions: z.number().int().min(0),
  nextReviewAt: z.number().int().min(0),
});

const batchReviewsBody = z.object({
  reviews: z.array(reviewBody.extend({ cardId: rowId })).min(1).max(500),
});

const scheduleBody = z.object({
  rating: z.enum(["easy", "medium", "hard"]),
  tzOffsetMinutes: z.number().int().optional(),
});

const isDue = (column: typeof flashcards.nextReviewAt, now: Date) =>
  or(isNull(column), lte(column, now));

/** Port of convex/flashcards.ts. Cron backfill/queue builders are not exposed here. */
export function createFlashcardsRouter(db: Db) {
  const router = Router();

  async function insertCards(
    userId: string,
    deckId: string,
    cards: Array<{ front: string; back: string }>,
    nextReviewAt: Date,
  ) {
    if (cards.length === 0) return;
    await db.insert(flashcards).values(
      cards.map((card, position) => ({
        userId,
        deckId,
        front: card.front,
        back: card.back,
        position,
        reviewCount: 0,
        easeFactor: DEFAULT_EASE_FACTOR,
        interval: 0,
        repetitions: 0,
        nextReviewAt,
      })),
    );
  }

  // getStudySummary
  router.get("/summary", async (_req, res) => {
    const user = currentUser(res);
    const now = Date.now();
    const startOfDay = getStartOfDay(new Date());

    const decks = await db.select().from(flashcardDecks).where(eq(flashcardDecks.userId, user.id));
    const totalCards = decks.reduce((sum, deck) => sum + (deck.cardCount ?? 0), 0);

    const dueRows = await db
      .select({ id: flashcards.id })
      .from(flashcards)
      .where(and(eq(flashcards.userId, user.id), isDue(flashcards.nextReviewAt, new Date(now))));

    const studiedToday = decks.filter(
      (deck) => deck.lastStudiedAt && deck.lastStudiedAt.getTime() >= startOfDay.getTime(),
    ).length;

    res.json({
      totalDecks: decks.length,
      totalCards,
      totalDue: dueRows.length,
      decksStudiedToday: studiedToday,
    });
  });

  // getDueFlashcards
  router.get("/due", async (_req, res) => {
    const user = currentUser(res);
    const now = new Date();
    const rows = await db
      .select()
      .from(flashcards)
      .where(and(eq(flashcards.userId, user.id), isDue(flashcards.nextReviewAt, now)))
      .orderBy(asc(flashcards.nextReviewAt), asc(flashcards.position));
    res.json(rows);
  });

  // getTodayQueue
  router.get("/today-queue", async (_req, res) => {
    const user = currentUser(res);
    const todayStart = getStartOfDay(new Date());
    const todayEnd = getEndOfDay(new Date());

    const [queue] = await db
      .select()
      .from(flashcardReviewQueues)
      .where(and(eq(flashcardReviewQueues.userId, user.id), eq(flashcardReviewQueues.date, todayStart)))
      .limit(1);

    if (queue) {
      res.json(queue);
      return;
    }

    const cards = await db
      .select({ id: flashcards.id })
      .from(flashcards)
      .where(and(eq(flashcards.userId, user.id), lte(flashcards.nextReviewAt, todayEnd)));

    const now = new Date();
    res.json({
      userId: user.id,
      date: todayStart,
      cardIds: cards.map((c) => c.id),
      createdAt: now,
      updatedAt: now,
    });
  });

  // getDecks
  router.get("/decks", async (_req, res) => {
    const user = currentUser(res);
    const decks = await db
      .select()
      .from(flashcardDecks)
      .where(eq(flashcardDecks.userId, user.id))
      .orderBy(desc(flashcardDecks.createdAt));
    res.json(decks);
  });

  // createDeckWithCards
  router.post("/decks", async (req, res) => {
    const user = currentUser(res);
    const body = parse(createDeckBody, req.body);
    if (body.sourceNoteId) await assertOwnedNote(db, body.sourceNoteId, user.id);

    const now = new Date();
    const [deck] = await db
      .insert(flashcardDecks)
      .values({
        userId: user.id,
        title: body.title,
        sourceNoteId: body.sourceNoteId,
        courseId: body.courseId,
        cardCount: body.cards.length,
      })
      .returning();

    await insertCards(user.id, deck.id, body.cards, now);
    res.status(201).json({ id: deck.id });
  });

  // createDeckWithCardsImmediate
  router.post("/decks/immediate", async (req, res) => {
    const user = currentUser(res);
    const body = parse(immediateDeckBody, req.body);
    const now = new Date();

    const [deck] = await db
      .insert(flashcardDecks)
      .values({
        userId: user.id,
        title: body.title,
        courseId: body.courseId,
        cardCount: body.cards.length,
      })
      .returning();

    await insertCards(user.id, deck.id, body.cards, now);
    res.status(201).json({ id: deck.id });
  });

  // deleteMultipleDecks
  router.post("/decks/batch-delete", async (req, res) => {
    const user = currentUser(res);
    const { deckIds } = parse(deleteManyBody, req.body);
    const owned = await db
      .select({ id: flashcardDecks.id })
      .from(flashcardDecks)
      .where(and(eq(flashcardDecks.userId, user.id), inArray(flashcardDecks.id, deckIds)));

    if (owned.length > 0) {
      await db.delete(flashcardDecks).where(
        inArray(
          flashcardDecks.id,
          owned.map((d) => d.id),
        ),
      );
    }

    res.json({ deletedCount: owned.length });
  });

  // getDeck
  router.get("/decks/:deckId", async (req, res) => {
    const deck = await findOwnedDeck(db, req.params.deckId, currentUser(res).id);
    if (!deck) {
      throw new HttpError(404, "Deck not found", "not_found");
    }
    res.json(deck);
  });

  // renameDeck
  router.patch("/decks/:deckId", async (req, res) => {
    const user = currentUser(res);
    const { title: nextTitle } = parse(renameBody, req.body);
    await requireOwnedDeck(db, req.params.deckId, user.id);
    await db.update(flashcardDecks).set({ title: nextTitle }).where(eq(flashcardDecks.id, req.params.deckId));
    res.status(204).end();
  });

  // deleteDeck
  router.delete("/decks/:deckId", async (req, res) => {
    const user = currentUser(res);
    await requireOwnedDeck(db, req.params.deckId, user.id);
    await db.delete(flashcardDecks).where(eq(flashcardDecks.id, req.params.deckId));
    res.status(204).end();
  });

  // markDeckStudied
  router.post("/decks/:deckId/studied", async (req, res) => {
    const user = currentUser(res);
    await requireOwnedDeck(db, req.params.deckId, user.id);
    await db
      .update(flashcardDecks)
      .set({ lastStudiedAt: new Date() })
      .where(eq(flashcardDecks.id, req.params.deckId));
    res.status(204).end();
  });

  // getDeckStats
  router.get("/decks/:deckId/stats", async (req, res) => {
    const user = currentUser(res);
    const deck = await findOwnedDeck(db, req.params.deckId, user.id);
    if (!deck) {
      res.json(null);
      return;
    }

    const cards = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.deckId, deck.id))
      .orderBy(asc(flashcards.position));

    const now = Date.now();
    const endOfDayTimestamp = getEndOfDay(new Date()).getTime();

    let newCards = 0;
    let learningCards = 0;
    let reviewCards = 0;
    let dueNow = 0;
    let dueToday = 0;
    let masteredCards = 0;
    let totalEaseFactor = 0;
    let cardsWithEaseFactor = 0;

    for (const card of cards) {
      const reviewCount = card.repetitions ?? card.reviewCount ?? 0;
      const easeFactor = card.easeFactor ?? card.difficulty ?? 2.5;
      const nextReview = card.nextReviewAt?.getTime();

      if (reviewCount === 0) {
        newCards++;
      } else if (reviewCount < 3) {
        learningCards++;
      } else {
        reviewCards++;
      }

      if (reviewCount >= 5 && easeFactor >= 2.3) {
        masteredCards++;
      }

      if (!nextReview || nextReview <= now) {
        dueNow++;
      } else if (nextReview <= endOfDayTimestamp) {
        dueToday++;
      }

      if (card.easeFactor || card.difficulty) {
        totalEaseFactor += easeFactor;
        cardsWithEaseFactor++;
      }
    }

    res.json({
      totalCards: cards.length,
      newCards,
      learningCards,
      reviewCards,
      dueNow,
      dueToday,
      masteredCards,
      averageEaseFactor: cardsWithEaseFactor > 0 ? totalEaseFactor / cardsWithEaseFactor : 2.5,
      lastStudiedAt: deck.lastStudiedAt,
    });
  });

  // getFlashcards
  router.get("/decks/:deckId/cards", async (req, res) => {
    const deck = await findOwnedDeck(db, req.params.deckId, currentUser(res).id);
    if (!deck) {
      res.json([]);
      return;
    }

    const cards = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.deckId, deck.id))
      .orderBy(asc(flashcards.position));
    res.json(cards);
  });

  // getDueCards
  router.get("/decks/:deckId/due", async (req, res) => {
    const deck = await findOwnedDeck(db, req.params.deckId, currentUser(res).id);
    if (!deck) {
      res.json([]);
      return;
    }

    const now = new Date();
    const cards = await db
      .select()
      .from(flashcards)
      .where(and(eq(flashcards.deckId, deck.id), isDue(flashcards.nextReviewAt, now)))
      .orderBy(asc(flashcards.nextReviewAt), asc(flashcards.position));
    res.json(cards);
  });

  // batchUpdateCardReviews
  router.post("/cards/reviews/batch", async (req, res) => {
    const user = currentUser(res);
    const { reviews } = parse(batchReviewsBody, req.body);
    const now = new Date();
    let updatedCount = 0;
    const deckIds = new Set<string>();

    for (const review of reviews) {
      const owned = await findOwnedCard(db, review.cardId, user.id);
      if (!owned) continue;

      await db
        .update(flashcards)
        .set({
          difficulty: review.easeFactor,
          nextReviewAt: new Date(review.nextReviewAt),
          reviewCount: (owned.card.reviewCount ?? 0) + 1,
          easeFactor: review.easeFactor,
          interval: review.interval,
          repetitions: review.repetitions,
          lastReviewedAt: now,
        })
        .where(eq(flashcards.id, review.cardId));

      updatedCount++;
      deckIds.add(owned.deck.id);
    }

    if (deckIds.size > 0) {
      await db
        .update(flashcardDecks)
        .set({ lastStudiedAt: now })
        .where(inArray(flashcardDecks.id, [...deckIds]));
    }

    res.json({ updatedCount });
  });

  // updateCard
  router.patch("/cards/:cardId", async (req, res) => {
    const user = currentUser(res);
    const body = parse(updateCardBody, req.body);
    await requireOwnedCard(db, req.params.cardId, user.id);
    await db.update(flashcards).set(body).where(eq(flashcards.id, req.params.cardId));
    res.status(204).end();
  });

  // updateCardReview
  router.post("/cards/:cardId/review", async (req, res) => {
    const user = currentUser(res);
    const body = parse(reviewBody, req.body);
    const { card, deck } = await requireOwnedCard(db, req.params.cardId, user.id);
    const now = new Date();

    await db
      .update(flashcards)
      .set({
        difficulty: body.easeFactor,
        nextReviewAt: new Date(body.nextReviewAt),
        reviewCount: (card.reviewCount ?? 0) + 1,
        easeFactor: body.easeFactor,
        interval: body.interval,
        repetitions: body.repetitions,
        lastReviewedAt: now,
      })
      .where(eq(flashcards.id, req.params.cardId));

    await db.update(flashcardDecks).set({ lastStudiedAt: now }).where(eq(flashcardDecks.id, deck.id));

    res.json({
      cardId: req.params.cardId,
      nextReviewAt: body.nextReviewAt,
      interval: body.interval,
    });
  });

  // scheduleNextReview
  router.post("/cards/:cardId/schedule", async (req, res) => {
    const user = currentUser(res);
    const { rating } = parse(scheduleBody, req.body); // tzOffsetMinutes ignored; gamification removed
    const { card, deck } = await requireOwnedCard(db, req.params.cardId, user.id);

    const result = scheduleNextReviewFromRating(rating, {
      easeFactor: card.easeFactor ?? card.difficulty ?? DEFAULT_EASE_FACTOR,
      interval: card.interval ?? 0,
      repetitions: card.repetitions ?? card.reviewCount ?? 0,
    });

    const now = new Date();
    await db
      .update(flashcards)
      .set({
        nextReviewAt: new Date(result.nextReviewAt),
        lastReviewedAt: new Date(result.lastReviewAt),
        easeFactor: result.easeFactor,
        interval: result.interval,
        repetitions: result.repetitions,
        lastRating: rating,
        reviewCount: result.repetitions,
      })
      .where(eq(flashcards.id, req.params.cardId));

    await db.insert(flashcardReviewEvents).values({
      userId: user.id,
      deckId: deck.id,
      cardId: req.params.cardId,
      rating,
      reviewedAt: now,
    });

    await db.update(flashcardDecks).set({ lastStudiedAt: now }).where(eq(flashcardDecks.id, deck.id));

    res.json({
      cardId: req.params.cardId,
      nextReviewAt: result.nextReviewAt,
      interval: result.interval,
      easeFactor: result.easeFactor,
      repetitions: result.repetitions,
    });
  });

  // resetCardProgress
  router.post("/cards/:cardId/reset", async (req, res) => {
    const user = currentUser(res);
    await requireOwnedCard(db, req.params.cardId, user.id);
    await db
      .update(flashcards)
      .set({
        easeFactor: DEFAULT_EASE_FACTOR,
        interval: 0,
        repetitions: 0,
        lastReviewedAt: null,
        lastRating: null,
        nextReviewAt: new Date(),
        reviewCount: 0,
      })
      .where(eq(flashcards.id, req.params.cardId));
    res.status(204).end();
  });

  return router;
}
