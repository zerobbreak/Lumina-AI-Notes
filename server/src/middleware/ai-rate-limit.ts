import { lt, sql } from "drizzle-orm";
import type { RequestHandler } from "express";
import type { Db } from "../db/client.js";
import { aiDailyUsage, aiRateLimitWindows } from "../db/schema/index.js";
import { HttpError } from "./errors.js";
import { currentUser } from "./user.js";

const WINDOW_MS = 60_000;
export const MAX_AI_CALLS_PER_MINUTE = 20;
/** Generous for a student's day of studying; stops one account running up the bill. */
export const MAX_AI_CALLS_PER_DAY = 300;
/** How long a stale window is kept around before the sweep drops it. */
const SWEEP_AGE_MS = 5 * WINDOW_MS;
const DAY_MS = 24 * 60 * 60 * 1000;

const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Counts one Gemini-backed call against the user's per-minute and per-day
 * limits, throwing a 429 when either is spent. Convex had no app-level limit
 * (only translated Gemini's own quota error), but these are now plain HTTP
 * endpoints that cost real Gemini spend per call. Counters live in Postgres so
 * they hold correctly if Railway ever scales to multiple instances.
 *
 * Call it before any work that reaches Gemini, including work that runs in
 * the background after the response is sent.
 */
export async function consumeAiQuota(db: Db, userId: string): Promise<void> {
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

  // Best-effort sweeps of old counters; never block the request on failure.
  db.delete(aiRateLimitWindows)
    .where(lt(aiRateLimitWindows.windowStart, new Date(now - SWEEP_AGE_MS)))
    .catch(() => {});
  db.delete(aiDailyUsage)
    .where(lt(aiDailyUsage.day, utcDay(now - 2 * DAY_MS)))
    .catch(() => {});

  if (minute.count > MAX_AI_CALLS_PER_MINUTE) {
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

  if (day.count > MAX_AI_CALLS_PER_DAY) {
    throw new HttpError(
      429,
      "You've reached today's AI usage limit. It resets at midnight UTC.",
      "daily_limit_reached",
    );
  }
}

/** Per-user limit on every route behind it; see consumeAiQuota. */
export function aiRateLimit(db: Db): RequestHandler {
  return async (_req, res, next) => {
    await consumeAiQuota(db, currentUser(res).id);
    next();
  };
}
