import { and, eq, gte, lte } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import {
  computePredictedReadyDate,
  DAY_IN_MS,
  getLocalDayStart,
} from "../analytics/helpers.js";
import type { Db } from "../db/client.js";
import {
  flashcardReviewEvents,
  flashcards,
  quizResults,
  recordings,
} from "../db/schema/index.js";
import { requireOwnedDeck as requireFlashcardDeck } from "../flashcards/helpers.js";
import { currentUser } from "../middleware/user.js";
import { requireOwnedDeck as requireQuizDeck } from "../quizzes/helpers.js";
import { parse } from "./validation.js";

const rangeQuery = z.object({
  start: z.coerce.number().int().min(0),
  end: z.coerce.number().int().min(0),
  tzOffsetMinutes: z.coerce.number().int(),
});

const tzQuery = z.object({
  tzOffsetMinutes: z.coerce.number().int(),
});

const readinessQuery = z.object({
  examDate: z.coerce.number().int().min(0).optional(),
});

/** Port of convex/analytics.ts */
export function createAnalyticsRouter(db: Db) {
  const router = Router();

  router.get("/daily-study-activity", async (req, res) => {
    const user = currentUser(res);
    const { start, end, tzOffsetMinutes } = parse(rangeQuery, req.query);
    const startDate = new Date(start);
    const endDate = new Date(end);

    const [reviewEvents, quizRows, recordingRows] = await Promise.all([
      db
        .select({ reviewedAt: flashcardReviewEvents.reviewedAt })
        .from(flashcardReviewEvents)
        .where(
          and(
            eq(flashcardReviewEvents.userId, user.id),
            gte(flashcardReviewEvents.reviewedAt, startDate),
            lte(flashcardReviewEvents.reviewedAt, endDate),
          ),
        ),
      db
        .select({ completedAt: quizResults.completedAt })
        .from(quizResults)
        .where(
          and(
            eq(quizResults.userId, user.id),
            gte(quizResults.completedAt, startDate),
            lte(quizResults.completedAt, endDate),
          ),
        ),
      db
        .select({ createdAt: recordings.createdAt })
        .from(recordings)
        .where(
          and(
            eq(recordings.userId, user.id),
            gte(recordings.createdAt, startDate),
            lte(recordings.createdAt, endDate),
          ),
        ),
    ]);

    const counts = new Map<number, number>();
    const add = (timestamp: number) => {
      const dayStart = getLocalDayStart(timestamp, tzOffsetMinutes);
      counts.set(dayStart, (counts.get(dayStart) ?? 0) + 1);
    };

    reviewEvents.forEach((e) => add(e.reviewedAt.getTime()));
    quizRows.forEach((r) => add(r.completedAt.getTime()));
    recordingRows.forEach((r) => add(r.createdAt.getTime()));

    const result = [...counts.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date - b.date);

    res.json(result);
  });

  router.get("/burnout-stats", async (req, res) => {
    const user = currentUser(res);
    const { tzOffsetMinutes } = parse(tzQuery, req.query);
    const now = Date.now();
    const start = now - 60 * DAY_IN_MS;
    const startDate = new Date(start);
    const endDate = new Date(now);

    const [reviewEvents, quizRows, recordingRows] = await Promise.all([
      db
        .select({ reviewedAt: flashcardReviewEvents.reviewedAt })
        .from(flashcardReviewEvents)
        .where(
          and(
            eq(flashcardReviewEvents.userId, user.id),
            gte(flashcardReviewEvents.reviewedAt, startDate),
            lte(flashcardReviewEvents.reviewedAt, endDate),
          ),
        ),
      db
        .select({ completedAt: quizResults.completedAt })
        .from(quizResults)
        .where(
          and(
            eq(quizResults.userId, user.id),
            gte(quizResults.completedAt, startDate),
            lte(quizResults.completedAt, endDate),
          ),
        ),
      db
        .select({ createdAt: recordings.createdAt })
        .from(recordings)
        .where(
          and(
            eq(recordings.userId, user.id),
            gte(recordings.createdAt, startDate),
            lte(recordings.createdAt, endDate),
          ),
        ),
    ]);

    const days = new Set<number>();
    const add = (timestamp: number) => {
      days.add(getLocalDayStart(timestamp, tzOffsetMinutes));
    };
    reviewEvents.forEach((e) => add(e.reviewedAt.getTime()));
    quizRows.forEach((r) => add(r.completedAt.getTime()));
    recordingRows.forEach((r) => add(r.createdAt.getTime()));

    const todayStart = getLocalDayStart(now, tzOffsetMinutes);
    let streakDays = 0;
    let cursor = todayStart;
    while (days.has(cursor)) {
      streakDays += 1;
      cursor -= DAY_IN_MS;
    }

    const level = streakDays >= 10 ? "high" : streakDays >= 7 ? "medium" : "low";
    res.json({ streakDays, level });
  });

  router.get("/quiz-decks/:deckId/performance", async (req, res) => {
    const user = currentUser(res);
    await requireQuizDeck(db, req.params.deckId, user.id);

    const results = await db
      .select()
      .from(quizResults)
      .where(and(eq(quizResults.userId, user.id), eq(quizResults.deckId, req.params.deckId)))
      .orderBy(quizResults.completedAt);

    res.json(
      results.map((r) => ({
        date: r.completedAt.getTime(),
        scorePercent: Math.round((r.score / r.totalQuestions) * 100),
      })),
    );
  });

  router.get("/flashcard-decks/:deckId/readiness-forecast", async (req, res) => {
    const user = currentUser(res);
    const { examDate } = parse(readinessQuery, req.query);
    await requireFlashcardDeck(db, req.params.deckId, user.id);

    const cards = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.deckId, req.params.deckId));

    const now = Date.now();
    const cardsRemaining = cards.filter(
      (c) =>
        (c.repetitions ?? 0) < 3 || !c.nextReviewAt || c.nextReviewAt.getTime() <= now,
    ).length;

    const weekAgo = new Date(now - 7 * DAY_IN_MS);
    const recentReviews = await db
      .select()
      .from(flashcardReviewEvents)
      .where(
        and(
          eq(flashcardReviewEvents.deckId, req.params.deckId),
          gte(flashcardReviewEvents.reviewedAt, weekAgo),
          lte(flashcardReviewEvents.reviewedAt, new Date(now)),
        ),
      );

    const avgDailyReviews = recentReviews.length / 7;
    if (avgDailyReviews === 0) {
      res.json({ predictedReadyDate: null, cardsRemaining, examDate });
      return;
    }

    const predictedReadyDate = computePredictedReadyDate(cardsRemaining, avgDailyReviews, now);
    res.json({ predictedReadyDate, cardsRemaining, examDate });
  });

  router.get("/flashcard-decks/:deckId/weak-topics", async (req, res) => {
    const user = currentUser(res);
    await requireFlashcardDeck(db, req.params.deckId, user.id);

    const cards = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.deckId, req.params.deckId));

    const monthAgo = new Date(Date.now() - 30 * DAY_IN_MS);
    const recentEvents = await db
      .select()
      .from(flashcardReviewEvents)
      .where(
        and(
          eq(flashcardReviewEvents.deckId, req.params.deckId),
          gte(flashcardReviewEvents.reviewedAt, monthAgo),
        ),
      );

    const hardCounts = new Map<string, number>();
    const totalCounts = new Map<string, number>();
    for (const event of recentEvents) {
      totalCounts.set(event.cardId, (totalCounts.get(event.cardId) ?? 0) + 1);
      if (event.rating === "hard") {
        hardCounts.set(event.cardId, (hardCounts.get(event.cardId) ?? 0) + 1);
      }
    }

    const scored = cards.map((card) => {
      const easeFactor = card.easeFactor ?? 2.5;
      const total = totalCounts.get(card.id) ?? 0;
      const hard = hardCounts.get(card.id) ?? 0;
      const hardRate = total > 0 ? hard / total : 0;
      const score = 1 / easeFactor + hardRate;
      return { card, easeFactor, score };
    });

    res.json(
      scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((item) => ({
          cardId: item.card.id,
          topic: item.card.front.slice(0, 80),
          easeFactor: item.easeFactor,
        })),
    );
  });

  return router;
}
