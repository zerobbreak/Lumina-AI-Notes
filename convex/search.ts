import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Subscription tier types for search scope restrictions
type SubscriptionTier = "free" | "scholar" | "institution";
type SearchScope = "single-note" | "course" | "all";

// Search scope per tier
const TIER_SEARCH_SCOPE: Record<SubscriptionTier, SearchScope> = {
  free: "single-note", // Free users: limited results
  scholar: "all",      // Scholar: full search
  institution: "all",  // Institution: full search
};

// Result limits per tier
const TIER_RESULT_LIMITS: Record<SubscriptionTier, number> = {
  free: 5,        // Free users get max 5 results per category
  scholar: 20,    // Scholar gets 20 results
  institution: 50, // Institution gets 50 results
};

export type SearchResult = {
  type: "note" | "file" | "deck";
  id: string;
  title: string;
  subtitle?: string; // e.g. "Note • Updated 2h ago"
  url: string;
  icon?: string;
};

export type SearchResponse = {
  results: SearchResult[];
  tier: SubscriptionTier;
  limitReached: boolean;
  totalFound?: number;
};

export const search = query({
  args: {
    query: v.string(),
    type: v.optional(v.union(v.literal("note"), v.literal("file"), v.literal("deck"), v.literal("all"))),
    courseId: v.optional(v.string()), // Optional: restrict to specific course
  },
  handler: async (ctx, args): Promise<SearchResponse> => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.tokenIdentifier;

    if (!userId) {
      return { results: [], tier: "free", limitReached: false };
    }

    if (!args.query) {
      return { results: [], tier: "free", limitReached: false };
    }

    // Get user's subscription tier
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", userId))
      .unique();

    // Determine effective tier
    let tier: SubscriptionTier = "free";
    if (user?.subscriptionTier) {
      const rawTier = user.subscriptionTier as SubscriptionTier;
      const status = user.subscriptionStatus;
      const endDate = user.subscriptionEndDate;
      const isActive = status === "active" && (!endDate || endDate > Date.now());
      tier = isActive ? rawTier : "free";
    }

    const searchScope = TIER_SEARCH_SCOPE[tier];
    const resultLimit = TIER_RESULT_LIMITS[tier];
    const searchType = args.type || "all";
    const results: SearchResult[] = [];
    let totalFound = 0;

    // Search Notes
    if (searchType === "all" || searchType === "note") {
      let notesQuery = ctx.db
        .query("notes")
        .withSearchIndex("search_title", (q) =>
          q.search("title", args.query).eq("userId", userId)
        )
        .filter((q) => q.neq(q.field("isArchived"), true));

      // For free tier with course restriction, filter by courseId
      if (searchScope === "single-note" && args.courseId) {
        notesQuery = notesQuery.filter((q) =>
          q.eq(q.field("courseId"), args.courseId)
        );
      }

      const notes = await notesQuery.take(resultLimit + 5); // Take a few extra to check if limit reached
      totalFound += notes.length;

      for (const note of notes.slice(0, resultLimit)) {
        results.push({
          type: "note",
          id: note._id,
          title: note.title,
          subtitle: note.isPinned ? "📌 Pinned Note" : "Note",
          url: `/dashboard?noteId=${note._id}`,
        });
      }
    }

    // Search Files
    if (searchType === "all" || searchType === "file") {
      let filesQuery = ctx.db
        .query("files")
        .withSearchIndex("search_name", (q) =>
          q.search("name", args.query).eq("userId", userId)
        );

      // For free tier with course restriction, filter by courseId
      if (searchScope === "single-note" && args.courseId) {
        filesQuery = filesQuery.filter((q) =>
          q.eq(q.field("courseId"), args.courseId)
        );
      }

      const files = await filesQuery.take(resultLimit + 5);
      totalFound += files.length;

      for (const file of files.slice(0, resultLimit)) {
        results.push({
          type: "file",
          id: file._id,
          title: file.name,
          subtitle: file.type.toUpperCase(),
          url: file.url || "#",
        });
      }
    }

    // Search Decks (flashcards and quizzes are Scholar features, but still searchable)
    if (searchType === "all" || searchType === "deck") {
      let decksQuery = ctx.db
        .query("flashcardDecks")
        .withSearchIndex("search_title", (q) =>
          q.search("title", args.query).eq("userId", userId)
        );

      // For free tier with course restriction, filter by courseId
      if (searchScope === "single-note" && args.courseId) {
        decksQuery = decksQuery.filter((q) =>
          q.eq(q.field("courseId"), args.courseId)
        );
      }

      const decks = await decksQuery.take(resultLimit + 5);
      totalFound += decks.length;

      for (const deck of decks.slice(0, resultLimit)) {
        results.push({
          type: "deck",
          id: deck._id,
          title: deck.title,
          subtitle: `Flashcards • ${deck.cardCount} cards`,
          url: `/dashboard?view=flashcards&deckId=${deck._id}`,
        });
      }
    }

    const limitReached = totalFound > results.length;

    return {
      results,
      tier,
      limitReached,
      totalFound: limitReached ? totalFound : undefined,
    };
  },
});

/**
 * Semantic search with tier restrictions
 * Free tier: limited to 3 results
 * Scholar/Institution: full semantic search
 */
export const semanticSearch = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.tokenIdentifier;

    if (!userId || !args.query) {
      return { results: [], tier: "free" as SubscriptionTier, limited: false };
    }

    // Get user's subscription tier
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", userId))
      .unique();

    let tier: SubscriptionTier = "free";
    if (user?.subscriptionTier) {
      const rawTier = user.subscriptionTier as SubscriptionTier;
      const status = user.subscriptionStatus;
      const endDate = user.subscriptionEndDate;
      const isActive = status === "active" && (!endDate || endDate > Date.now());
      tier = isActive ? rawTier : "free";
    }

    // Free tier gets max 3 semantic search results
    const maxResults = tier === "free" ? 3 : (args.limit || 10);
    const limited = tier === "free";

    return {
      results: [], // Actual semantic search happens in ai.ts action
      tier,
      limited,
      maxResults,
    };
  },
});
