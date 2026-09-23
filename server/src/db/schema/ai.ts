import { date, index, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
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

/**
 * Gemini calls per user per UTC day. The per-minute window stops bursts; this
 * caps what one account can spend in a day however it paces its calls.
 */
export const aiDailyUsage = pgTable(
  "ai_daily_usage",
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** UTC calendar day, "YYYY-MM-DD". */
    day: date({ mode: "string" }).notNull(),
    count: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] }), index().on(t.day)],
);
