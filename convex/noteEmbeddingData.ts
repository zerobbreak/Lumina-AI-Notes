import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";

export const isCurrent = internalQuery({
  args: {
    noteId: v.id("notes"),
    title: v.string(),
    content: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    return (
      note !== null &&
      note.title === args.title &&
      (note.content ?? "") === args.content
    );
  },
});

export const storeIfCurrent = internalMutation({
  args: {
    noteId: v.id("notes"),
    title: v.string(),
    content: v.string(),
    embedding: v.array(v.float64()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (
      note === null ||
      note.title !== args.title ||
      (note.content ?? "") !== args.content
    ) {
      return false;
    }

    await ctx.db.patch(args.noteId, { embedding: args.embedding });
    return true;
  },
});
