import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
        deckId,
        front: card.front,
        back: card.back,
        reviewCount: 0,
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
 */
export const updateCardReview = mutation({
  args: {
    cardId: v.id("flashcards"),
    difficulty: v.number(),
    nextReviewAt: v.number(),
    reviewCount: v.number(),
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
      difficulty: args.difficulty,
      nextReviewAt: args.nextReviewAt,
      reviewCount: args.reviewCount,
    });
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
    const cards = await ctx.db
      .query("flashcards")
      .withIndex("by_deckId", (q) => q.eq("deckId", args.deckId))
      .collect();

    // Return cards that are due for review (nextReviewAt <= now or never reviewed)
    return cards.filter(
      (card) => !card.nextReviewAt || card.nextReviewAt <= now
    );
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
        deckId,
        front: card.front,
        back: card.back,
        reviewCount: 0,
        nextReviewAt: now,
      });
    }

    return deckId;
  },
});
