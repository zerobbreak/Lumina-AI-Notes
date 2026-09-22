import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { users, type MonthlyUsage } from "../db/schema/index.js";

export const AUDIO_LIMIT_MINUTES = 300;

/** Mirrors convex/recordings.ts getUserUsage — resets in memory when the month rolls over. */
export function normalizeUsage(
  raw: MonthlyUsage | null | undefined,
  now = Date.now(),
): MonthlyUsage {
  let usage = raw ?? { audioMinutesUsed: 0, notesCreated: 0, lastResetDate: now };
  const lastReset = new Date(usage.lastResetDate);
  const today = new Date(now);
  const shouldReset =
    lastReset.getMonth() !== today.getMonth() || lastReset.getFullYear() !== today.getFullYear();
  if (shouldReset) {
    usage = { audioMinutesUsed: 0, notesCreated: 0, lastResetDate: now };
  }
  return usage;
}

export async function getUserUsage(db: Db, userId: string, now = Date.now()) {
  const [user] = await db.select({ monthlyUsage: users.monthlyUsage }).from(users).where(eq(users.id, userId)).limit(1);
  return normalizeUsage(user?.monthlyUsage ?? null, now);
}

/** Port of convex/recordings.ts checkAndUpdateAudioUsage. Persists a month rollover. */
export async function checkAndUpdateAudioUsage(
  db: Db,
  userId: string,
  durationMinutes: number,
): Promise<{ allowed: boolean; error?: string; remaining?: number }> {
  const usage = await getUserUsage(db, userId);
  const limit = AUDIO_LIMIT_MINUTES;

  if (limit !== Infinity) {
    const newTotal = usage.audioMinutesUsed + durationMinutes;
    if (newTotal > limit) {
      return {
        allowed: false,
        error: `Audio limit exceeded. You have ${Math.max(0, limit - usage.audioMinutesUsed).toFixed(1)} minutes remaining this month.`,
        remaining: Math.max(0, limit - usage.audioMinutesUsed),
      };
    }
  }

  await db
    .update(users)
    .set({
      monthlyUsage: {
        ...usage,
        audioMinutesUsed: usage.audioMinutesUsed + durationMinutes,
      },
    })
    .where(eq(users.id, userId));

  return {
    allowed: true,
    remaining: limit - usage.audioMinutesUsed - durationMinutes,
  };
}
