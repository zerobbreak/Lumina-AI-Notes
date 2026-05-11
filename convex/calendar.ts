import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Activity for the calendar: recordings and notes whose createdAt falls in [startMs, endMs].
 * Pass range bounds computed in the client's local timezone so grid days align with the user.
 */
export const getCalendarActivity = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { recordings: [], notes: [] };
    }

    const uid = identity.tokenIdentifier;

    const recordings = await ctx.db
      .query("recordings")
      .withIndex("by_userId_createdAt", (q) =>
        q.eq("userId", uid).gte("createdAt", args.startMs).lte("createdAt", args.endMs),
      )
      .collect();

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_userId_and_createdAt", (q) =>
        q.eq("userId", uid).gte("createdAt", args.startMs).lte("createdAt", args.endMs),
      )
      .filter((q) => q.neq(q.field("isArchived"), true))
      .collect();

    return { recordings, notes };
  },
});
