import { v } from "convex/values";
import { query } from "./_generated/server";
const DEFAULT_RESULT_LIMIT = 20;

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
  limitReached: boolean;
  totalFound?: number;
};

export const search = query({
  args: {
    query: v.string(),
    type: v.optional(
      v.union(
        v.literal("note"),
        v.literal("file"),
        v.literal("deck"),
        v.literal("all"),
      ),
    ),
    courseId: v.optional(v.string()), // Optional: restrict to specific course
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args): Promise<SearchResponse> => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.tokenIdentifier;

    if (!userId) {
      return { results: [], limitReached: false };
    }

    if (!args.query) {
      return { results: [], limitReached: false };
    }

    const resultLimit = DEFAULT_RESULT_LIMIT;
    const searchType = args.type || "all";
    const results: SearchResult[] = [];
    let totalFound = 0;

    // Search Notes
    if (searchType === "all" || searchType === "note") {
      const notesQuery = ctx.db
        .query("notes")
        .withSearchIndex("search_title", (q) =>
          q.search("title", args.query).eq("userId", userId),
        )
        .filter((q) => q.neq(q.field("isArchived"), true));

      const fetchLimit =
        args.tagIds && args.tagIds.length > 0 ? 50 : resultLimit + 5;
      const notes = await notesQuery.take(fetchLimit);

      let filteredNotes = notes;

      // Filter by Tags (Intersection)
      if (args.tagIds && args.tagIds.length > 0) {
        const requiredTags = new Set(args.tagIds);
        filteredNotes = notes.filter((n) => {
          if (!n.tagIds) return false;
          // Check if note has ALL required tags
          // Note: n.tagIds is strict array of IDs.
          return args.tagIds!.every((tId) => n.tagIds!.includes(tId));
        });
      }

      totalFound += filteredNotes.length;

      for (const note of filteredNotes.slice(0, resultLimit)) {
        results.push({
          type: "note",
          id: note._id,
          title: note.title,
          subtitle: note.isPinned ? "📌 Pinned Note" : "Note",
          url: `/dashboard?noteId=${note._id}`,
        });
      }
    }

    // Skip Files and Decks if filtering by tags (as they don't have tags yet)
    if (args.tagIds && args.tagIds.length > 0) {
      // Return early or just let the blocks below not run
      const limitReached = totalFound > results.length;
      return {
        results,
        limitReached,
        totalFound: limitReached ? totalFound : undefined,
      };
    }

    // Search Files
    if (searchType === "all" || searchType === "file") {
      const filesQuery = ctx.db
        .query("files")
        .withSearchIndex("search_name", (q) =>
          q.search("name", args.query).eq("userId", userId),
        );

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
      const decksQuery = ctx.db
        .query("flashcardDecks")
        .withSearchIndex("search_title", (q) =>
          q.search("title", args.query).eq("userId", userId),
        );

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
      return { results: [], limited: false, maxResults: args.limit || 10 };
    }

    const maxResults = args.limit || 10;
    const limited = false;

    return {
      results: [], // Actual semantic search happens in ai.ts action
      limited,
      maxResults,
    };
  },
});
