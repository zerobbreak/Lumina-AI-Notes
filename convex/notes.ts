import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createNote = mutation({
  args: {
    title: v.string(),
    major: v.optional(v.string()),
    courseId: v.optional(v.string()),
    moduleId: v.optional(v.string()),
    parentNoteId: v.optional(v.id("notes")),
    style: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called createNote without authentication present");
    }

    const noteId = await ctx.db.insert("notes", {
      userId: identity.tokenIdentifier,
      title: args.title,
      major: args.major,
      courseId: args.courseId,
      moduleId: args.moduleId,
      parentNoteId: args.parentNoteId,
      style: args.style || "standard",
      content: "",
      isPinned: false,
      createdAt: Date.now(),
    });

    return noteId;
  },
});

export const getRecentNotes = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .order("desc") // Most recent first
      .take(5);

    return notes;
  },
});

export const deleteNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.delete(args.noteId);
  },
});

export const toggleArchiveNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");
    // If it doesn't have isArchived field yet, treat as false -> true
    const currentArchived = note.isArchived ?? false;
    await ctx.db.patch(args.noteId, { isArchived: !currentArchived });
  },
});

export const renameNote = mutation({
  args: { noteId: v.id("notes"), title: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.patch(args.noteId, { title: args.title });
  },
});
