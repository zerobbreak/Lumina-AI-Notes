import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all quiz decks for the current user
 */
export const getDecks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const decks = await ctx.db
      .query("quizDecks")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .order("desc")
      .collect();

    return decks;
  },
});

/**
 * Get a single quiz deck by ID
 */
export const getDeck = query({
  args: { deckId: v.id("quizDecks") },
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
 * Get all questions in a quiz deck
 */
export const getQuestions = query({
  args: { deckId: v.id("quizDecks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify user owns the deck before returning questions
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== identity.tokenIdentifier) {
      return [];
    }

    const questions = await ctx.db
      .query("quizQuestions")
      .withIndex("by_deckId", (q) => q.eq("deckId", args.deckId))
      .collect();

    return questions;
  },
});

/**
 * Create a new quiz deck with questions
 */
export const createDeckWithQuestions = mutation({
  args: {
    title: v.string(),
    sourceNoteId: v.optional(v.id("notes")),
    courseId: v.optional(v.string()),
    questions: v.array(
      v.object({
        question: v.string(),
        options: v.array(v.string()),
        correctAnswer: v.number(),
        explanation: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Create the deck
    const deckId = await ctx.db.insert("quizDecks", {
      userId: identity.tokenIdentifier,
      title: args.title,
      sourceNoteId: args.sourceNoteId,
      courseId: args.courseId,
      questionCount: args.questions.length,
      createdAt: Date.now(),
    });

    // Create all questions
    for (const question of args.questions) {
      await ctx.db.insert("quizQuestions", {
        deckId,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      });
    }

    return deckId;
  },
});

/**
 * Delete a quiz deck and all its questions and results
 */
export const deleteDeck = mutation({
  args: { deckId: v.id("quizDecks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify ownership
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== identity.tokenIdentifier) {
      throw new Error("Deck not found or access denied");
    }

    // Delete all questions in the deck
    const questions = await ctx.db
      .query("quizQuestions")
      .withIndex("by_deckId", (q) => q.eq("deckId", args.deckId))
      .collect();

    for (const question of questions) {
      await ctx.db.delete(question._id);
    }

    // Delete all results for this deck
    const results = await ctx.db
      .query("quizResults")
      .withIndex("by_deckId", (q) => q.eq("deckId", args.deckId))
      .collect();

    for (const result of results) {
      await ctx.db.delete(result._id);
    }

    // Delete the deck
    await ctx.db.delete(args.deckId);
  },
});

/**
 * Save quiz result after completion
 */
export const saveResult = mutation({
  args: {
    deckId: v.id("quizDecks"),
    score: v.number(),
    totalQuestions: v.number(),
    answers: v.array(v.number()),
    timeSpent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify ownership
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== identity.tokenIdentifier) {
      throw new Error("Deck not found or access denied");
    }

    // Save the result
    const resultId = await ctx.db.insert("quizResults", {
      deckId: args.deckId,
      userId: identity.tokenIdentifier,
      score: args.score,
      totalQuestions: args.totalQuestions,
      answers: args.answers,
      completedAt: Date.now(),
      timeSpent: args.timeSpent,
    });

    // Update deck's lastTakenAt
    await ctx.db.patch(args.deckId, {
      lastTakenAt: Date.now(),
    });

    return resultId;
  },
});

/**
 * Get quiz results for a specific deck
 */
export const getResults = query({
  args: { deckId: v.id("quizDecks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const results = await ctx.db
      .query("quizResults")
      .withIndex("by_userId_and_deckId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("deckId", args.deckId)
      )
      .order("desc")
      .collect();

    return results;
  },
});

/**
 * Get the most recent result for a deck
 */
export const getLatestResult = query({
  args: { deckId: v.id("quizDecks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const results = await ctx.db
      .query("quizResults")
      .withIndex("by_userId_and_deckId", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("deckId", args.deckId)
      )
      .order("desc")
      .first();

    return results;
  },
});

/**
 * Rename a quiz deck
 */
export const renameDeck = mutation({
  args: {
    deckId: v.id("quizDecks"),
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
 * Delete multiple quiz decks and all their questions and results (batch operation)
 */
export const deleteMultipleDecks = mutation({
  args: { deckIds: v.array(v.id("quizDecks")) },
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

      // Delete all questions in the deck
      const questions = await ctx.db
        .query("quizQuestions")
        .withIndex("by_deckId", (q) => q.eq("deckId", deckId))
        .collect();

      for (const question of questions) {
        await ctx.db.delete(question._id);
      }

      // Delete all results for this deck
      const results = await ctx.db
        .query("quizResults")
        .withIndex("by_deckId", (q) => q.eq("deckId", deckId))
        .collect();

      for (const result of results) {
        await ctx.db.delete(result._id);
      }

      // Delete the deck
      await ctx.db.delete(deckId);
      deletedCount++;
    }

    return { deletedCount };
  },
});

