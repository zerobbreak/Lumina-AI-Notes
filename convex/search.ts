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
  },
  handler: async (ctx, args) => {
    const userId = (await ctx.auth.getUserIdentity())?.tokenIdentifier;

    if (!userId) {
      return [];
    }

    if (!args.query) {
      return [];
    }

    // Parallel search across multiple tables
    const [notes, files, decks] = await Promise.all([
      ctx.db
        .query("notes")
        .withSearchIndex("search_title", (q) =>
          q.search("title", args.query).eq("userId", userId)
        )
        .take(5),
      ctx.db
        .query("files")
        .withSearchIndex("search_name", (q) =>
          q.search("name", args.query).eq("userId", userId)
        )
        .take(5),
      ctx.db
        .query("flashcardDecks")
        .withSearchIndex("search_title", (q) =>
          q.search("title", args.query).eq("userId", userId)
        )
        .take(5),
    ]);

    const results: SearchResult[] = [];

    // Format Notes
    for (const note of notes) {
      results.push({
        type: "note",
        id: note._id,
        title: note.title,
        subtitle: "Note",
        url: `/dashboard?noteId=${note._id}`,
      });
    }

    // Format Files
    for (const file of files) {
      results.push({
        type: "file",
        id: file._id,
        title: file.name,
        subtitle: file.type.toUpperCase(),
        url: file.url || "#",
      });
    }

    // Format Decks
    for (const deck of decks) {
      results.push({
        type: "deck",
        id: deck._id,
        title: deck.title,
        subtitle: `Flashcards • ${deck.cardCount} cards`,
        url: `/dashboard?view=flashcards&deckId=${deck._id}`,
      });
    }

    return results;
  },
});
