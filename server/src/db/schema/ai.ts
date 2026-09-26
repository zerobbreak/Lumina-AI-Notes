import { date, index, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { createdAt, id, timestamptz } from "./columns.js";
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
 * caps what one account can spend in a day however it paces its calls. Kept
 * forever (one small row per active user per day): it's the history the beta
 * uses to decide where plan limits go.
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

/**
 * One row per Gemini generate call that reached a model, with the tokens it
 * used. What a user actually costs, per feature; see scripts/usage-report.ts.
 * Deleting the account keeps its rows but drops the link to it, so spend
 * totals stay right without keeping anything that identifies the user.
 */
export const aiUsageEvents = pgTable(
  "ai_usage_events",
  {
    id: id(),
    /** Null once the account is deleted, or for a call made outside any user's work. */
    userId: text().references(() => users.id, { onDelete: "set null" }),
    /** Route ("POST /api/v1/ai/refine-text") or job kind ("recording.process"). */
    feature: text().notNull(),
    model: text().notNull(),
    inputTokens: integer().notNull().default(0),
    outputTokens: integer().notNull().default(0),
    /** Includes thinking tokens, which are billed as output. */
    totalTokens: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.createdAt), index().on(t.createdAt)],
);
