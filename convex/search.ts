import { v } from "convex/values";
import { query } from "./_generated/server";
import {
  buildKeywordSnippet,
  countKeywordHits,
  parseKeywords,
  stripHtmlToText,
} from "./shared/keywordSearch";
const DEFAULT_RESULT_LIMIT = 20;
/** Candidates pulled from the index before snippet scoring narrows them down. */
const CONTENT_SCAN_LIMIT = 40;

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

export type KeywordMatch = {
  noteId: string;
  title: string;
  /** Plain-text window centred on the first keyword hit. */
  snippet: string;
  /** Distinct query keywords actually present in the note body. */
  matchedKeywords: string[];
  url: string;
};

/**
 * Keyword search across note *bodies* (the `search_title` index only covers
 * titles). Returns a snippet centred on the hit plus the keywords that matched,
 * so the caller can highlight them without shipping whole notes to the client.
 */
export const searchNoteContent = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ matches: KeywordMatch[] }> => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.tokenIdentifier;
    if (!userId) return { matches: [] };

    const keywords = parseKeywords(args.query);
    if (keywords.length === 0) return { matches: [] };

    const limit = Math.min(args.limit ?? 6, DEFAULT_RESULT_LIMIT);

    const candidates = await ctx.db
      .query("notes")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.query).eq("userId", userId),
      )
      .filter((q) => q.neq(q.field("isArchived"), true))
      .take(CONTENT_SCAN_LIMIT);

    const scored: Array<{ hits: number; match: KeywordMatch }> = [];

    for (const note of candidates) {
      const text = stripHtmlToText(note.content ?? "");
      if (!text) continue;

      const hits = countKeywordHits(text, keywords);
      // The index matches on stemmed tokens; require a literal hit so the
      // snippet we return actually contains something worth highlighting.
      if (hits === 0) continue;

      scored.push({
        hits,
        match: {
          noteId: note._id,
          title: note.title,
          snippet: buildKeywordSnippet(text, keywords),
          matchedKeywords: keywords.filter((k) =>
            text.toLowerCase().includes(k),
          ),
          url: `/dashboard?noteId=${note._id}`,
        },
      });
    }

    // Most distinct keywords first; the search index already ordered by
    // relevance, so a stable sort keeps that as the tie-breaker.
    scored.sort((a, b) => b.hits - a.hits);

    return { matches: scored.slice(0, limit).map((s) => s.match) };
  },
});

/**
 * Semantic search with tier restrictions
 * Free tier: limited to 3 results
 * Scholar/Institution: full semantic search
 */
// TODO: Wire up to ai.ts semantic search action — currently a stub
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
