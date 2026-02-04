import { query } from "./_generated/server";
import { v } from "convex/values";
import {
  DAY_IN_MS,
  getLocalDayStart,
  computePredictedReadyDate,
} from "../lib/analytics";

export const getDailyStudyActivity = query({
  args: {
    start: v.number(),
    end: v.number(),
    tzOffsetMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const [reviewEvents, quizResults, recordings] = await Promise.all([
      ctx.db
        .query("flashcardReviewEvents")
        .withIndex("by_userId_reviewedAt", (q) =>
          q
            .eq("userId", identity.tokenIdentifier)
            .gte("reviewedAt", args.start)
            .lte("reviewedAt", args.end),
        )
        .collect(),
      ctx.db
        .query("quizResults")
        .withIndex("by_userId_completedAt", (q) =>
          q
            .eq("userId", identity.tokenIdentifier)
            .gte("completedAt", args.start)
            .lte("completedAt", args.end),
        )
        .collect(),
      ctx.db
        .query("recordings")
        .withIndex("by_userId_createdAt", (q) =>
          q
            .eq("userId", identity.tokenIdentifier)
            .gte("createdAt", args.start)
            .lte("createdAt", args.end),
        )
        .collect(),
    ]);

    const counts = new Map<number, number>();
    const add = (timestamp: number) => {
      const dayStart = getLocalDayStart(timestamp, args.tzOffsetMinutes);
      counts.set(dayStart, (counts.get(dayStart) ?? 0) + 1);
    };

    reviewEvents.forEach((e) => add(e.reviewedAt));
    quizResults.forEach((r) => add(r.completedAt));
    recordings.forEach((r) => add(r.createdAt));

    const result = Array.from(counts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date - b.date);

    return result;
  },
});

export const getDeckPerformance = query({
  args: { deckId: v.id("quizDecks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const results = await ctx.db
      .query("quizResults")
      .withIndex("by_userId_and_deckId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("deckId", args.deckId),
      )
      .order("asc")
      .collect();

    return results.map((r) => ({
      date: r.completedAt,
      scorePercent: Math.round((r.score / r.totalQuestions) * 100),
    }));
  },
});

export const getBurnoutStats = query({
  args: { tzOffsetMinutes: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { streakDays: 0, level: "low" as const };

    const now = Date.now();
    const start = now - 60 * DAY_IN_MS;

    const [reviewEvents, quizResults, recordings] = await Promise.all([
      ctx.db
        .query("flashcardReviewEvents")
        .withIndex("by_userId_reviewedAt", (q) =>
          q
            .eq("userId", identity.tokenIdentifier)
            .gte("reviewedAt", start)
            .lte("reviewedAt", now),
        )
        .collect(),
      ctx.db
        .query("quizResults")
        .withIndex("by_userId_completedAt", (q) =>
          q
            .eq("userId", identity.tokenIdentifier)
            .gte("completedAt", start)
            .lte("completedAt", now),
        )
        .collect(),
      ctx.db
        .query("recordings")
        .withIndex("by_userId_createdAt", (q) =>
          q
            .eq("userId", identity.tokenIdentifier)
            .gte("createdAt", start)
            .lte("createdAt", now),
        )
        .collect(),
    ]);

    const days = new Set<number>();
    const add = (timestamp: number) => {
      days.add(getLocalDayStart(timestamp, args.tzOffsetMinutes));
    };

    reviewEvents.forEach((e) => add(e.reviewedAt));
    quizResults.forEach((r) => add(r.completedAt));
    recordings.forEach((r) => add(r.createdAt));

    const todayStart = getLocalDayStart(now, args.tzOffsetMinutes);
    let streakDays = 0;
    let cursor = todayStart;
    while (days.has(cursor)) {
      streakDays += 1;
      cursor -= DAY_IN_MS;
    }

    const level =
      streakDays >= 10 ? "high" : streakDays >= 7 ? "medium" : "low";

    return { streakDays, level };
  },
});

export const getReadinessForecast = query({
  args: {
    deckId: v.id("flashcardDecks"),
    examDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== identity.tokenIdentifier) return null;

    const cards = await ctx.db
      .query("flashcards")
      .withIndex("by_deckId", (q) => q.eq("deckId", args.deckId))
      .collect();

    const now = Date.now();
    const cardsRemaining = cards.filter(
      (c) =>
        (c.repetitions ?? 0) < 3 || !c.nextReviewAt || c.nextReviewAt <= now,
    ).length;

    const recentReviews = await ctx.db
      .query("flashcardReviewEvents")
      .withIndex("by_deckId_reviewedAt", (q) =>
        q
          .eq("deckId", args.deckId)
          .gte("reviewedAt", now - 7 * DAY_IN_MS)
          .lte("reviewedAt", now),
      )
      .collect();

    const avgDailyReviews = recentReviews.length / 7;
    if (avgDailyReviews === 0) {
      return { predictedReadyDate: null, cardsRemaining };
    }

    const predictedReadyDate = computePredictedReadyDate(
      cardsRemaining,
      avgDailyReviews,
      now,
    );

    return { predictedReadyDate, cardsRemaining, examDate: args.examDate };
  },
});

export const getWeakTopics = query({
  args: { deckId: v.id("flashcardDecks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== identity.tokenIdentifier) return [];

    const cards = await ctx.db
      .query("flashcards")
      .withIndex("by_deckId", (q) => q.eq("deckId", args.deckId))
      .collect();

    const recentEvents = await ctx.db
      .query("flashcardReviewEvents")
      .withIndex("by_deckId_reviewedAt", (q) =>
        q
          .eq("deckId", args.deckId)
          .gte("reviewedAt", Date.now() - 30 * DAY_IN_MS),
      )
      .collect();

    const hardCounts = new Map<string, number>();
    const totalCounts = new Map<string, number>();
    for (const event of recentEvents) {
      const key = event.cardId;
      totalCounts.set(key, (totalCounts.get(key) ?? 0) + 1);
      if (event.rating === "hard") {
        hardCounts.set(key, (hardCounts.get(key) ?? 0) + 1);
      }
    }

    const scored = cards.map((card) => {
      const easeFactor = card.easeFactor ?? 2.5;
      const total = totalCounts.get(card._id) ?? 0;
      const hard = hardCounts.get(card._id) ?? 0;
      const hardRate = total > 0 ? hard / total : 0;
      const score = (1 / easeFactor) + hardRate;
      return { card, easeFactor, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => ({
        cardId: item.card._id,
        topic: item.card.front.slice(0, 80),
        easeFactor: item.easeFactor,
      }));
  },
});
