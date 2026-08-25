import { v } from "convex/values";
import {
  mutation,
  query,
  internalQuery,
  internalMutation,
  internalAction,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const createTag = mutation({
  args: {
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Check if tag with same name exists for this user
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_userId_name", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("name", args.name),
      )
      .unique();

    if (existing) {
      throw new Error("Tag with this name already exists");
    }

    const tagId = await ctx.db.insert("tags", {
      userId: identity.tokenIdentifier,
      name: args.name,
      color: args.color,
    });

    return tagId;
  },
});

export const getTags = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("tags")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .collect();
  },
});

/** Tags for the sidebar: note count per tag, most-used first. */
export const getTagsWithCounts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const [tags, notes] = await Promise.all([
      ctx.db
        .query("tags")
        .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
        .collect(),
      ctx.db
        .query("notes")
        .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
        .collect(),
    ]);

    const counts = new Map<string, number>();
    for (const note of notes) {
      if (!note.parentNoteId && note.tagIds) {
        for (const tagId of note.tagIds) {
          counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
        }
      }
    }

    return tags
      .map((tag) => ({ ...tag, count: counts.get(tag._id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  },
});

export const updateTag = mutation({
  args: {
    tagId: v.id("tags"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const tag = await ctx.db.get(args.tagId);
    if (!tag || tag.userId !== identity.tokenIdentifier) {
      throw new Error("Tag not found or unauthorized");
    }

    const updates: any = {};
    if (args.name) updates.name = args.name;
    if (args.color) updates.color = args.color;

    await ctx.db.patch(args.tagId, updates);
  },
});

export const deleteTag = mutation({
  args: {
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const tag = await ctx.db.get(args.tagId);
    if (!tag || tag.userId !== identity.tokenIdentifier) {
      throw new Error("Tag not found or unauthorized");
    }

    // Remove this tag from all notes that have it
    // NOTE: This could be slow if user has many notes with this tag.
    // For now, doing it iteratively. Ideally, scheduling a background job.
    // But since this is a small-scale app, we can iterate.
    // Actually, let's just delete the tag. The IDs in notes will become dangling references.
    // It's cleaner to remove them.

    // Find all notes with this tag
    // We can't query by array containment easily in standard Convex unless we use full text search or just filter.
    // Given the constraints, allowing dangling references (filtering them out on read) is faster for deletion,
    // but cleaning up is better.
    // Let's just delete the tag row for now. On the frontend, we filter out tags that don't exist in the `tags` list.

    await ctx.db.delete(args.tagId);
  },
});

// ---------------------------------------------------------------------------
// Auto-tagging: scheduled from notes.updateNote once a note has real content
// and no tags yet. Runs Gemini once per note, reusing existing tags where
// they fit instead of always minting new ones.
// ---------------------------------------------------------------------------

const AUTO_TAG_COLORS = [
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#ec4899", // pink
  "#22c55e", // green
  "#8b5cf6", // violet
];

export const getNoteForAutoTag = internalQuery({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => ctx.db.get(args.noteId),
});

export const getTagsForUserInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("tags")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect(),
});

export const applyAutoTags = internalMutation({
  args: {
    noteId: v.id("notes"),
    userId: v.string(),
    tagNames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) return;

    const existingTags = await ctx.db
      .query("tags")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const tagIds: any[] = [];
    for (const rawName of args.tagNames) {
      const name = rawName.trim();
      if (!name) continue;

      const match = existingTags.find(
        (t) => t.name.toLowerCase() === name.toLowerCase(),
      );
      if (match) {
        tagIds.push(match._id);
        continue;
      }

      const color =
        AUTO_TAG_COLORS[existingTags.length % AUTO_TAG_COLORS.length];
      const newTagId = await ctx.db.insert("tags", {
        userId: args.userId,
        name,
        color,
      });
      existingTags.push({
        _id: newTagId,
        _creationTime: Date.now(),
        userId: args.userId,
        name,
        color,
      } as any);
      tagIds.push(newTagId);
    }

    await ctx.db.patch(args.noteId, {
      tagIds: Array.from(new Set([...(note.tagIds ?? []), ...tagIds])),
      autoTagAttempted: true,
    });
  },
});

export const autoTagNote = internalAction({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const note = await ctx.runQuery(internal.tags.getNoteForAutoTag, {
      noteId: args.noteId,
    });
    if (!note || (note.tagIds && note.tagIds.length > 0)) return;

    const plainText = (note.content ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (plainText.length < 50) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return;

    const existingTags = await ctx.runQuery(
      internal.tags.getTagsForUserInternal,
      { userId: note.userId },
    );

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" },
      });

      const result = await model.generateContent(`You tag study notes for a student's note-taking app.

Note title: ${note.title}
Note content (excerpt): ${plainText.slice(0, 3000)}

The student's existing tags: ${
        existingTags.length
          ? existingTags.map((t) => t.name).join(", ")
          : "(none yet)"
      }

Pick up to 3 short tags (1-3 words each, no punctuation) that best describe this note. Reuse an existing tag verbatim whenever it genuinely fits instead of creating a near-duplicate. Only propose a new tag when nothing existing fits. If nothing fits well, return fewer tags rather than forcing one.

Respond with a JSON array of strings only, e.g. ["recursion", "midterm review"]. Return [] if no tag is a good fit.`);

      const text = result.response.text().trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return;

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) return;

      const seen = new Set<string>();
      const tagNames = parsed
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .map((t) => t.trim())
        .filter((t) => {
          const key = t.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 3);

      if (tagNames.length > 0) {
        await ctx.runMutation(internal.tags.applyAutoTags, {
          noteId: args.noteId,
          userId: note.userId,
          tagNames,
        });
      }
    } catch (error) {
      console.error("autoTagNote error:", error);
    }
  },
});
