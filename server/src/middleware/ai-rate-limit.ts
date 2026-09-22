import { lt, sql } from "drizzle-orm";
import type { RequestHandler } from "express";
import type { Db } from "../db/client.js";
import { aiRateLimitWindows } from "../db/schema/index.js";
import { HttpError } from "./errors.js";
import { currentUser } from "./user.js";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
/** How long a stale window is kept around before the sweep drops it. */
const SWEEP_AGE_MS = 5 * WINDOW_MS;

/**
 * Per-user fixed-window limit on /api/v1/ai/*: Convex had no app-level limit
 * (only translated Gemini's own quota error), but these are now plain HTTP
 * endpoints that cost real Gemini spend per call. Counter lives in Postgres
 * so it holds correctly if Railway ever scales to multiple instances.
 */
export function aiRateLimit(db: Db): RequestHandler {
  return async (_req, res, next) => {
    const user = currentUser(res);
    const windowStart = new Date(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS);

    const [row] = await db
      .insert(aiRateLimitWindows)
      .values({ userId: user.id, windowStart, count: 1 })
      .onConflictDoUpdate({
        target: [aiRateLimitWindows.userId, aiRateLimitWindows.windowStart],
        set: { count: sql`${aiRateLimitWindows.count} + 1` },
      })
      .returning();

    // Best-effort sweep of old windows; never blocks the request on failure.
    db.delete(aiRateLimitWindows)
      .where(lt(aiRateLimitWindows.windowStart, new Date(Date.now() - SWEEP_AGE_MS)))
      .catch(() => {});

    if (row.count > MAX_PER_WINDOW) {
      next(new HttpError(429, "Too many AI requests. Try again in a moment.", "rate_limited"));
      return;
    }
    next();
  };
}
