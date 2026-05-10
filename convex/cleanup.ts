import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Daily cleanup job: delete notes + files not accessed since cutoff.
 *
 * - Uses indexes for the primary scan.
 * - Also handles legacy docs with `lastAccessedAt` missing by falling back to `createdAt`.
 */
export const cleanupStaleNotesAndFilesInternal = internalMutation({
  args: {
    cutoff: v.number(), // ms timestamp
    perUserLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const perUserLimit = Math.max(1, Math.min(500, args.perUserLimit ?? 200));

    const users = await ctx.db.query("users").collect();
    let deletedNotes = 0;
    let deletedFiles = 0;

    for (const u of users) {
      const userId = u.tokenIdentifier;

      // ---- Notes ----
      const staleNotes = await ctx.db
        .query("notes")
        .withIndex("by_userId_and_lastAccessedAt", (q) =>
          q.eq("userId", userId).lte("lastAccessedAt", args.cutoff),
        )
        .take(perUserLimit);

      // Legacy notes without lastAccessedAt: fall back to createdAt.
      const legacyCandidates = await ctx.db
        .query("notes")
        .withIndex("by_userId_and_createdAt", (q) =>
          q.eq("userId", userId).lte("createdAt", args.cutoff),
        )
        .take(perUserLimit);
      const legacyNotes = legacyCandidates.filter((n) => n.lastAccessedAt == null);

      for (const n of [...staleNotes, ...legacyNotes].slice(0, perUserLimit)) {
        await ctx.db.delete(n._id);
        deletedNotes += 1;
      }

      // ---- Files ----
      const staleFiles = await ctx.db
        .query("files")
        .withIndex("by_userId_lastAccessedAt", (q) =>
          q.eq("userId", userId).lte("lastAccessedAt", args.cutoff),
        )
        .take(perUserLimit);

      const legacyFileCandidates = await ctx.db
        .query("files")
        .withIndex("by_userId_createdAt", (q) =>
          q.eq("userId", userId).lte("createdAt", args.cutoff),
        )
        .take(perUserLimit);
      const legacyFiles = legacyFileCandidates.filter((f) => f.lastAccessedAt == null);

      for (const f of [...staleFiles, ...legacyFiles].slice(0, perUserLimit)) {
        if (f.storageId) {
          // Best effort: remove blob from Convex Storage too.
          await ctx.storage.delete(f.storageId);
        }
        await ctx.db.delete(f._id);
        deletedFiles += 1;
      }
    }

    return { deletedNotes, deletedFiles, usersScanned: users.length };
  },
});

