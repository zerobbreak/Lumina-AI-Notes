import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

export type SearchResult = {
  type: "note" | "file" | "deck";
  id: string;
  title: string;
  subtitle?: string; // e.g. "Note • Updated 2h ago"
  url: string;
  icon?: string;
};

export const search = query({
  args: {
    query: v.string(),
    type: v.optional(v.union(v.literal("note"), v.literal("file"), v.literal("deck"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    const userId = (await ctx.auth.getUserIdentity())?.tokenIdentifier;

    if (!userId) {
      return [];
    }

    if (!args.query) {
      return [];
    }

    const searchType = args.type || "all";
    const results: SearchResult[] = [];

    // Search Notes
    if (searchType === "all" || searchType === "note") {
      const notes = await ctx.db
        .query("notes")
        .withSearchIndex("search_title", (q) =>
          q.search("title", args.query).eq("userId", userId)
        )
        .filter((q) => q.neq(q.field("isArchived"), true))
        .take(10);

      for (const note of notes) {
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
      const files = await ctx.db
        .query("files")
        .withSearchIndex("search_name", (q) =>
          q.search("name", args.query).eq("userId", userId)
        )
        .take(10);

      for (const file of files) {
        results.push({
          type: "file",
          id: file._id,
          title: file.name,
          subtitle: file.type.toUpperCase(),
          url: file.url || "#",
        });
      }
    }

    // Search Decks
    if (searchType === "all" || searchType === "deck") {
      const decks = await ctx.db
        .query("flashcardDecks")
        .withSearchIndex("search_title", (q) =>
          q.search("title", args.query).eq("userId", userId)
        )
        .take(10);

      for (const deck of decks) {
        results.push({
          type: "deck",
          id: deck._id,
          title: deck.title,
          subtitle: `Flashcards • ${deck.cardCount} cards`,
          url: `/dashboard?view=flashcards&deckId=${deck._id}`,
        });
      }
    }

    return results;
  },
});
