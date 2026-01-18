import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// How long before a presence entry is considered stale (60 seconds)
const PRESENCE_TIMEOUT_MS = 60 * 1000;

/**
 * Send a heartbeat to indicate the user is viewing a note.
 * Creates or updates the presence entry.
 */
export const heartbeat = mutation({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.tokenIdentifier;
    const now = Date.now();

    // Check if presence entry already exists
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_userId_noteId", (q) =>
        q.eq("userId", userId).eq("noteId", args.noteId)
      )
      .unique();

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        lastSeen: now,
        userName: identity.name || identity.email || "Anonymous",
        userImage: identity.pictureUrl,
      });
    } else {
      // Create new entry
      await ctx.db.insert("presence", {
        noteId: args.noteId,
        userId,
        userName: identity.name || identity.email || "Anonymous",
        userImage: identity.pictureUrl,
        lastSeen: now,
      });
    }

    return { success: true };
  },
});

/**
 * Get all users currently viewing a note (within the timeout window).
 * Excludes the current user from the list.
 */
export const getViewers = query({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const currentUserId = identity?.tokenIdentifier;

    const cutoff = Date.now() - PRESENCE_TIMEOUT_MS;

    // Get all presence entries for this note
    const presenceEntries = await ctx.db
      .query("presence")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
      .collect();

    // Filter to only active entries (within timeout) and exclude current user
    const activeViewers = presenceEntries
      .filter((entry) => entry.lastSeen > cutoff)
      .filter((entry) => entry.userId !== currentUserId)
      .map((entry) => ({
        id: entry._id,
        userId: entry.userId,
        userName: entry.userName || "Anonymous",
        userImage: entry.userImage,
        lastSeen: entry.lastSeen,
      }));

    return activeViewers;
  },
});

/**
 * Remove presence when user leaves a note.
 */
export const leave = mutation({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false };
    }

    const userId = identity.tokenIdentifier;

    // Find and delete the presence entry
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_userId_noteId", (q) =>
        q.eq("userId", userId).eq("noteId", args.noteId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});

/**
 * Clean up stale presence entries.
 * This can be called periodically or triggered by other operations.
 */
export const cleanupStale = mutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - PRESENCE_TIMEOUT_MS;

    // Get all stale entries
    const staleEntries = await ctx.db
      .query("presence")
      .withIndex("by_lastSeen")
      .filter((q) => q.lt(q.field("lastSeen"), cutoff))
      .collect();

    // Delete stale entries
    for (const entry of staleEntries) {
      await ctx.db.delete(entry._id);
    }

    return { deleted: staleEntries.length };
  },
});

/**
 * Get the count of viewers for a note (useful for showing "X people viewing").
 */
export const getViewerCount = query({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const currentUserId = identity?.tokenIdentifier;

    const cutoff = Date.now() - PRESENCE_TIMEOUT_MS;

    const presenceEntries = await ctx.db
      .query("presence")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
      .collect();

    // Count active viewers excluding current user
    const count = presenceEntries.filter(
      (entry) => entry.lastSeen > cutoff && entry.userId !== currentUserId
    ).length;

    return count;
  },
});
