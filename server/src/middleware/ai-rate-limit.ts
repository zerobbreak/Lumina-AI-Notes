import { lt, sql } from "drizzle-orm";
import type { RequestHandler } from "express";
import type { Db } from "../db/client.js";
import { aiDailyUsage, aiRateLimitWindows } from "../db/schema/index.js";
import { limitsFor, PLANS } from "../plans/limits.js";
import { HttpError } from "./errors.js";
import { currentUser, type User } from "./user.js";

const WINDOW_MS = 60_000;
/** The default plan's limits; a user's own come from limitsFor. */
export const MAX_AI_CALLS_PER_MINUTE = PLANS.beta.aiCallsPerMinute;
export const MAX_AI_CALLS_PER_DAY = PLANS.beta.aiCallsPerDay;
/** How long a stale window is kept around before the sweep drops it. */
const SWEEP_AGE_MS = 5 * WINDOW_MS;

const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Counts one Gemini-backed call against the user's per-minute and per-day
 * limits (their plan's, see plans/limits.ts), throwing a 429 when either is
 * spent. Convex had no app-level limit (only translated Gemini's own quota
 * error), but these are now plain HTTP
 * endpoints that cost real Gemini spend per call. Counters live in Postgres so
 * they hold correctly if Railway ever scales to multiple instances.
 *
 * Call it before any work that reaches Gemini, including work that runs in
 * the background after the response is sent.
 */
export async function consumeAiQuota(db: Db, user: Pick<User, "id" | "plan" | "limitOverrides">): Promise<void> {
  const userId = user.id;
  const limits = limitsFor(user);
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / WINDOW_MS) * WINDOW_MS);

  const [minute] = await db
    .insert(aiRateLimitWindows)
    .values({ userId, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [aiRateLimitWindows.userId, aiRateLimitWindows.windowStart],
      set: { count: sql`${aiRateLimitWindows.count} + 1` },
    })
    .returning();

  // Best-effort sweep of old windows; never block the request on failure.
  // Daily rows are kept: they're the usage history plan limits are set from.
  db.delete(aiRateLimitWindows)
    .where(lt(aiRateLimitWindows.windowStart, new Date(now - SWEEP_AGE_MS)))
    .catch(() => {});

  if (minute.count > limits.aiCallsPerMinute) {
    // Refused before touching the daily count, so a client hammering the
    // per-minute limit doesn't also burn through its day.
    throw new HttpError(429, "Too many AI requests. Try again in a moment.", "rate_limited");
  }

  const [day] = await db
    .insert(aiDailyUsage)
    .values({ userId, day: utcDay(now), count: 1 })
    .onConflictDoUpdate({
      target: [aiDailyUsage.userId, aiDailyUsage.day],
      set: { count: sql`${aiDailyUsage.count} + 1` },
    })
    .returning();

  if (day.count > limits.aiCallsPerDay) {
    throw new HttpError(
      429,
      `You've used all ${limits.aiCallsPerDay} AI requests for today. They reset at midnight UTC.`,
      "daily_limit_reached",
    );
  }
}

/** Per-user limit on every route behind it; see consumeAiQuota. */
export function aiRateLimit(db: Db): RequestHandler {
  return async (_req, res, next) => {
    await consumeAiQuota(db, currentUser(res));
    next();
  };
}
