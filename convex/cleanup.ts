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

    const perUserResults = await Promise.all(
      users.map(async (u) => {
        const userId = u.tokenIdentifier;

        // The four scans below are independent reads, so run them
        // concurrently instead of round-tripping one at a time.
        const [staleNotes, legacyCandidates, staleFiles, legacyFileCandidates] =
          await Promise.all([
            ctx.db
              .query("notes")
              .withIndex("by_userId_and_lastAccessedAt", (q) =>
                q.eq("userId", userId).lte("lastAccessedAt", args.cutoff),
              )
              .take(perUserLimit),
            // Legacy notes without lastAccessedAt: fall back to createdAt.
            ctx.db
              .query("notes")
              .withIndex("by_userId_and_createdAt", (q) =>
                q.eq("userId", userId).lte("createdAt", args.cutoff),
              )
              .take(perUserLimit),
            ctx.db
              .query("files")
              .withIndex("by_userId_lastAccessedAt", (q) =>
                q.eq("userId", userId).lte("lastAccessedAt", args.cutoff),
              )
              .take(perUserLimit),
            ctx.db
              .query("files")
              .withIndex("by_userId_createdAt", (q) =>
                q.eq("userId", userId).lte("createdAt", args.cutoff),
              )
              .take(perUserLimit),
          ]);

        const legacyNotes = legacyCandidates.filter((n) => n.lastAccessedAt == null);
        const legacyFiles = legacyFileCandidates.filter(
          (f) => f.lastAccessedAt == null,
        );

        const notesToDelete = [...staleNotes, ...legacyNotes].slice(0, perUserLimit);
        const filesToDelete = [...staleFiles, ...legacyFiles].slice(0, perUserLimit);

        await Promise.all([
          ...notesToDelete.map((n) => ctx.db.delete(n._id)),
          ...filesToDelete.map(async (f) => {
            if (f.storageId) {
              // Best effort: remove blob from Convex Storage too.
              await ctx.storage.delete(f.storageId);
            }
            await ctx.db.delete(f._id);
          }),
        ]);

        return { deletedNotes: notesToDelete.length, deletedFiles: filesToDelete.length };
      }),
    );

    const deletedNotes = perUserResults.reduce((sum, r) => sum + r.deletedNotes, 0);
    const deletedFiles = perUserResults.reduce((sum, r) => sum + r.deletedFiles, 0);

    return { deletedNotes, deletedFiles, usersScanned: users.length };
  },
});

