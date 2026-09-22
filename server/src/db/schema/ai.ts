import { index, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { timestamptz } from "./columns.js";
import { users } from "./users.js";

/**
 * Fixed one-minute windows for the /api/v1/ai/* per-user rate limit (Convex
 * had none — these routes now cost real Gemini spend per HTTP call). One row
 * per user per window; the route middleware upserts and increments it.
 */
export const aiRateLimitWindows = pgTable(
  "ai_rate_limit_windows",
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    windowStart: timestamptz().notNull(),
    count: integer().notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.windowStart] }),
    // Sweeping stale windows scans by windowStart alone.
    index().on(t.windowStart),
  ],
);
