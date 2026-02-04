import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import {
  DEFAULT_EASE_FACTOR,
  scheduleNextReviewFromRating,
} from "../lib/spacedRepetition";

type Rating = "easy" | "medium" | "hard";

const DAY_MS = 24 * 60 * 60 * 1000;

const getStartOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const getEndOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

/**
 * Get all flashcard decks for the current user
 */
export const getDecks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const decks = await ctx.db
      .query("flashcardDecks")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .order("desc")
      .collect();

    return decks;
  },
});

/**
 * Get a single deck by ID
 */
export const getDeck = query({
  args: { deckId: v.id("flashcardDecks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== identity.tokenIdentifier) {
      return null;
    }
    return deck;
  },
});

/**
 * Get all flashcards in a deck
 */
export const getFlashcards = query({
  args: { deckId: v.id("flashcardDecks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify user owns the deck before returning cards
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== identity.tokenIdentifier) {
      return [];
    }

    const cards = await ctx.db
      .query("flashcards")
      .withIndex("by_deckId", (q) => q.eq("deckId", args.deckId))
      .collect();

    return cards;
  },
});

/**
 * Create a new deck with flashcards
 */
export const createDeckWithCards = mutation({
  args: {
    title: v.string(),
    sourceNoteId: v.optional(v.id("notes")),
    courseId: v.optional(v.string()),
    cards: v.array(
      v.object({
        front: v.string(),
        back: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Create the deck
    const deckId = await ctx.db.insert("flashcardDecks", {
      userId: identity.tokenIdentifier,
      title: args.title,
      sourceNoteId: args.sourceNoteId,
      courseId: args.courseId,
      cardCount: args.cards.length,
      createdAt: Date.now(),
    });

    // Create all flashcards
    for (const card of args.cards) {
      await ctx.db.insert("flashcards", {
        userId: identity.tokenIdentifier,
        deckId,
        front: card.front,
        back: card.back,
        reviewCount: 0,
        easeFactor: DEFAULT_EASE_FACTOR,
        interval: 0,
        repetitions: 0,
        nextReviewAt: Date.now(),
      });
    }

    return deckId;
  },
});

/**
 * Delete a deck and all its cards
 */
export const deleteDeck = mutation({
  args: { deckId: v.id("flashcardDecks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify ownership
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== identity.tokenIdentifier) {
      throw new Error("Deck not found or access denied");
    }

    // Delete all flashcards in the deck
    const cards = await ctx.db
      .query("flashcards")
      .withIndex("by_deckId", (q) => q.eq("deckId", args.deckId))
      .collect();

    for (const card of cards) {
      await ctx.db.delete(card._id);
    }

    // Delete the deck
    await ctx.db.delete(args.deckId);
  },
});

/**
 * Update a single flashcard (for editing)
 */
export const updateCard = mutation({
  args: {
    cardId: v.id("flashcards"),
    front: v.optional(v.string()),
    back: v.optional(v.string()),
    difficulty: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get card and verify ownership through deck
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const deck = await ctx.db.get(card.deckId);
    if (!deck || deck.userId !== identity.tokenIdentifier) {
      throw new Error("Unauthorized");
    }

    const { cardId, ...updates } = args;

    // Filter out undefined values
    const cleanUpdates: Record<string, string | number> = {};
    if (updates.front !== undefined) cleanUpdates.front = updates.front;
    if (updates.back !== undefined) cleanUpdates.back = updates.back;
    if (updates.difficulty !== undefined)
      cleanUpdates.difficulty = updates.difficulty;

    await ctx.db.patch(cardId, cleanUpdates);
  },
});

/**
 * Update a card's spaced repetition data after review
 * Uses SM-2 algorithm parameters
 */
export const updateCardReview = mutation({
  args: {
    cardId: v.id("flashcards"),
    quality: v.number(), // SM-2 quality rating 0-5
    easeFactor: v.number(),
    interval: v.number(),
    repetitions: v.number(),
    nextReviewAt: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get card and verify ownership through deck
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const deck = await ctx.db.get(card.deckId);
    if (!deck || deck.userId !== identity.tokenIdentifier) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.cardId, {
      difficulty: args.easeFactor, // Legacy field (kept for backward compatibility)
      nextReviewAt: args.nextReviewAt,
      reviewCount: (card.reviewCount || 0) + 1,
      easeFactor: args.easeFactor,
      interval: args.interval,
      repetitions: args.repetitions,
      lastReviewedAt: Date.now(),
    });

    // Update deck's lastStudiedAt
    await ctx.db.patch(deck._id, {
      lastStudiedAt: Date.now(),
    });

    return {
      cardId: args.cardId,
      nextReviewAt: args.nextReviewAt,
      interval: args.interval,
    };
  },
});

/**
 * Batch update multiple cards after a study session
 */
export const batchUpdateCardReviews = mutation({
  args: {
    reviews: v.array(
      v.object({
        cardId: v.id("flashcards"),
        quality: v.number(),
        easeFactor: v.number(),
        interval: v.number(),
        repetitions: v.number(),
        nextReviewAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const updatedCards: string[] = [];
    const deckIds = new Set<string>();

    for (const review of args.reviews) {
      const card = await ctx.db.get(review.cardId);
      if (!card) continue;

      const deck = await ctx.db.get(card.deckId);
      if (!deck || deck.userId !== identity.tokenIdentifier) continue;

      await ctx.db.patch(review.cardId, {
        difficulty: review.easeFactor, // Legacy field
        nextReviewAt: review.nextReviewAt,
        reviewCount: (card.reviewCount || 0) + 1,
        easeFactor: review.easeFactor,
        interval: review.interval,
        repetitions: review.repetitions,
        lastReviewedAt: Date.now(),
      });

      updatedCards.push(review.cardId);
      deckIds.add(deck._id);
    }

    // Update lastStudiedAt for all affected decks
    const now = Date.now();
    for (const deckId of deckIds) {
      await ctx.db.patch(deckId as any, {
        lastStudiedAt: now,
      });
    }

    return { updatedCount: updatedCards.length };
  },
});

/**
 * Get cards due for review (spaced repetition)
 */
export const getDueCards = query({
  args: { deckId: v.id("flashcardDecks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== identity.tokenIdentifier) {
      return [];
    }

    const now = Date.now();
    return await ctx.db
      .query("flashcards")
      .withIndex("by_deckId_nextReviewAt", (q) =>
        q.eq("deckId", args.deckId).lte("nextReviewAt", now),
      )
      .order("asc")
      .collect();
  },
});

/**
 * Mark a deck as studied (updates lastStudiedAt)
 */
export const markDeckStudied = mutation({
  args: { deckId: v.id("flashcardDecks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== identity.tokenIdentifier) {
      throw new Error("Deck not found or unauthorized");
    }

    await ctx.db.patch(args.deckId, {
      lastStudiedAt: Date.now(),
    });
  },
});

/**
 * Get detailed statistics for a deck (for spaced repetition dashboard)
 */
export const getDeckStats = query({
  args: { deckId: v.id("flashcardDecks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== identity.tokenIdentifier) {
      return null;
    }

    const cards = await ctx.db
      .query("flashcards")
      .withIndex("by_deckId", (q) => q.eq("deckId", args.deckId))
      .collect();

    const now = Date.now();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const endOfDayTimestamp = endOfDay.getTime();

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
      const nextReview = card.nextReviewAt;

      // Categorize by learning stage
      if (reviewCount === 0) {
        newCards++;
      } else if (reviewCount < 3) {
        learningCards++;
      } else {
        reviewCards++;
      }

      // Check if mastered (reviewed 5+ times with high ease factor)
      if (reviewCount >= 5 && easeFactor >= 2.3) {
        masteredCards++;
      }

      // Check if due
      if (!nextReview || nextReview <= now) {
        dueNow++;
      } else if (nextReview <= endOfDayTimestamp) {
        dueToday++;
      }

      // Track ease factor
      if (card.easeFactor || card.difficulty) {
        totalEaseFactor += easeFactor;
        cardsWithEaseFactor++;
      }
    }

    return {
      totalCards: cards.length,
      newCards,
      learningCards,
      reviewCards,
      dueNow,
      dueToday,
      masteredCards,
      averageEaseFactor: cardsWithEaseFactor > 0 
        ? totalEaseFactor / cardsWithEaseFactor 
        : 2.5,
      lastStudiedAt: deck.lastStudiedAt,
    };
  },
});

/**
 * Get study summary across all decks for a user
 */
export const getStudySummary = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const decks = await ctx.db
      .query("flashcardDecks")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .collect();

    const now = Date.now();
    let totalDue = 0;
    let totalCards = 0;
    let studiedToday = 0;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayTimestamp = startOfDay.getTime();

    for (const deck of decks) {
      const cards = await ctx.db
        .query("flashcards")
        .withIndex("by_deckId", (q) => q.eq("deckId", deck._id))
        .collect();

      totalCards += cards.length;

      for (const card of cards) {
        if (!card.nextReviewAt || card.nextReviewAt <= now) {
          totalDue++;
        }
      }

      // Check if studied today
      if (deck.lastStudiedAt && deck.lastStudiedAt >= startOfDayTimestamp) {
        studiedToday++;
      }
    }

    return {
      totalDecks: decks.length,
      totalCards,
      totalDue,
      decksStudiedToday: studiedToday,
    };
  },
});

/**
 * Rename a deck
 */
export const renameDeck = mutation({
  args: {
    deckId: v.id("flashcardDecks"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== identity.tokenIdentifier) {
      throw new Error("Deck not found or access denied");
    }

    await ctx.db.patch(args.deckId, { title: args.title });
  },
});

/**
 * Delete multiple decks and all their cards (batch operation)
 */
export const deleteMultipleDecks = mutation({
  args: { deckIds: v.array(v.id("flashcardDecks")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    let deletedCount = 0;
    
    for (const deckId of args.deckIds) {
      // Verify ownership
      const deck = await ctx.db.get(deckId);
      if (!deck || deck.userId !== identity.tokenIdentifier) {
        continue; // Skip decks that don't exist or aren't owned by user
      }

      // Delete all flashcards in the deck
      const cards = await ctx.db
        .query("flashcards")
        .withIndex("by_deckId", (q) => q.eq("deckId", deckId))
        .collect();

      for (const card of cards) {
        await ctx.db.delete(card._id);
      }

      // Delete the deck
      await ctx.db.delete(deckId);
      deletedCount++;
    }
    
    return { deletedCount };
  },
});

/**
 * Create a new deck with flashcards - cards have nextReviewAt set to now
 * for immediate appearance in the study queue.
 * Used by the "Quick Flashcards" drop zone feature.
 */
export const createDeckWithCardsImmediate = mutation({
  args: {
    title: v.string(),
    sourceFileName: v.optional(v.string()),
    courseId: v.optional(v.string()),
    cards: v.array(
      v.object({
        front: v.string(),
        back: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Create the deck
    const deckId = await ctx.db.insert("flashcardDecks", {
      userId: identity.tokenIdentifier,
      title: args.title,
      courseId: args.courseId,
      cardCount: args.cards.length,
      createdAt: Date.now(),
    });

    // Create all flashcards with nextReviewAt = now for immediate study
    const now = Date.now();
    for (const card of args.cards) {
      await ctx.db.insert("flashcards", {
        userId: identity.tokenIdentifier,
        deckId,
        front: card.front,
        back: card.back,
        reviewCount: 0,
        nextReviewAt: now,
        easeFactor: DEFAULT_EASE_FACTOR,
        interval: 0,
        repetitions: 0,
      });
    }

    return deckId;
  },
});

/**
 * Schedule next review after a user rating
 */
export const scheduleNextReview = mutation({
  args: {
    cardId: v.id("flashcards"),
    rating: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    tzOffsetMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const deck = await ctx.db.get(card.deckId);
    if (!deck || deck.userId !== identity.tokenIdentifier) {
      throw new Error("Unauthorized");
    }

    const result = scheduleNextReviewFromRating(args.rating as Rating, {
      easeFactor: card.easeFactor ?? card.difficulty ?? DEFAULT_EASE_FACTOR,
      interval: card.interval ?? 0,
      repetitions: card.repetitions ?? card.reviewCount ?? 0,
    });

    await ctx.db.patch(args.cardId, {
      nextReviewAt: result.nextReviewAt,
      lastReviewedAt: result.lastReviewAt,
      easeFactor: result.easeFactor,
      interval: result.interval,
      repetitions: result.repetitions,
      lastRating: args.rating,
      reviewCount: result.repetitions,
    });

    await ctx.db.insert("flashcardReviewEvents", {
      userId: deck.userId,
      deckId: deck._id,
      cardId: args.cardId,
      rating: args.rating,
      reviewedAt: Date.now(),
    });

    await ctx.runMutation(api.users.updateStudyStreak, {
      tzOffsetMinutes: args.tzOffsetMinutes,
    });

    await ctx.db.patch(deck._id, {
      lastStudiedAt: Date.now(),
    });

    return {
      cardId: args.cardId,
      nextReviewAt: result.nextReviewAt,
      interval: result.interval,
      easeFactor: result.easeFactor,
      repetitions: result.repetitions,
    };
  },
});

/**
 * Reset a card's progress to defaults
 */
export const resetCardProgress = mutation({
  args: { cardId: v.id("flashcards") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const deck = await ctx.db.get(card.deckId);
    if (!deck || deck.userId !== identity.tokenIdentifier) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.cardId, {
      easeFactor: DEFAULT_EASE_FACTOR,
      interval: 0,
      repetitions: 0,
      lastReviewedAt: undefined,
      lastRating: undefined,
      nextReviewAt: Date.now(),
      reviewCount: 0,
    });
  },
});

/**
 * Get all due flashcards across all decks for the current user
 */
export const getDueFlashcards = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const now = Date.now();
    return await ctx.db
      .query("flashcards")
      .withIndex("by_userId_nextReviewAt", (q) =>
        q.eq("userId", identity.tokenIdentifier).lte("nextReviewAt", now),
      )
      .order("asc")
      .collect();
  },
});

/**
 * Get today's materialized queue for the current user
 */
export const getTodayQueue = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const todayStart = getStartOfDay(new Date());
    const queue = await ctx.db
      .query("flashcardReviewQueues")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("date", todayStart),
      )
      .unique();

    if (queue) return queue;

    // Fallback: compute on the fly if queue not present yet
    const endOfDay = getEndOfDay(new Date());
    const cards = await ctx.db
      .query("flashcards")
      .withIndex("by_userId_nextReviewAt", (q) =>
        q.eq("userId", identity.tokenIdentifier).lte("nextReviewAt", endOfDay),
      )
      .collect();

    return {
      userId: identity.tokenIdentifier,
      date: todayStart,
      cardIds: cards.map((c) => c._id),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  },
});

/**
 * Backfill SRS fields for existing cards (internal)
 */
export const initializeSrsFieldsInternal = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200;
    const cards = await ctx.db.query("flashcards").take(limit * 3);

    let updated = 0;

    for (const card of cards) {
      if (updated >= limit) break;

      const needsUserId = !card.userId;
      const needsEase = card.easeFactor === undefined;
      const needsReps = card.repetitions === undefined;

      if (!needsUserId && !needsEase && !needsReps) continue;

      const deck = await ctx.db.get(card.deckId);
      if (!deck) continue;

      const nextReviewAt = card.nextReviewAt ?? Date.now();
      const repetitions = card.repetitions ?? card.reviewCount ?? 0;
      const easeFactor = card.easeFactor ?? card.difficulty ?? DEFAULT_EASE_FACTOR;
      const interval =
        card.interval ??
        (repetitions > 0 && card.nextReviewAt ? 1 : 0);

      await ctx.db.patch(card._id, {
        userId: deck.userId,
        nextReviewAt,
        easeFactor,
        repetitions,
        interval,
      });
      updated++;
    }

    return { updated };
  },
});

/**
 * Build or update today's queues for all users (internal)
 */
export const buildDailyQueuesInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const todayStart = getStartOfDay(new Date());
    const todayEnd = getEndOfDay(new Date());
    const now = Date.now();

    for (const user of users) {
      const dueCards = await ctx.db
        .query("flashcards")
        .withIndex("by_userId_nextReviewAt", (q) =>
          q.eq("userId", user.tokenIdentifier).lte("nextReviewAt", todayEnd),
        )
        .collect();

      const existing = await ctx.db
        .query("flashcardReviewQueues")
        .withIndex("by_userId_date", (q) =>
          q.eq("userId", user.tokenIdentifier).eq("date", todayStart),
        )
        .unique();

      const cardIds = dueCards.map((c) => c._id);

      if (existing) {
        await ctx.db.patch(existing._id, {
          cardIds,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("flashcardReviewQueues", {
          userId: user.tokenIdentifier,
          date: todayStart,
          cardIds,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { processedUsers: users.length };
  },
});
