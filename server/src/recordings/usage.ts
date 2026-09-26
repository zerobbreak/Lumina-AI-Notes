import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { users, type MonthlyUsage } from "../db/schema/index.js";
import { PLANS } from "../plans/limits.js";

/** The default plan's monthly minutes; a user's own come from limitsFor. */
export const AUDIO_LIMIT_MINUTES = PLANS.beta.audioMinutesPerMonth;

/** Largest audio file the transcription routes will read into memory and send to Gemini. */
export const MAX_TRANSCRIBE_BYTES = 50 * 1024 * 1024;

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
  limit: number,
): Promise<{ allowed: boolean; error?: string; remaining?: number }> {
  const usage = await getUserUsage(db, userId);

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

/**
 * Records minutes for audio that was already transcribed. Unlike
 * checkAndUpdateAudioUsage it never refuses: the work is done, so the
 * minutes count even when they tip the user over the limit.
 */
export async function chargeAudioMinutes(db: Db, userId: string, durationMinutes: number) {
  if (!(durationMinutes > 0)) return;
  const usage = await getUserUsage(db, userId);
  await db
    .update(users)
    .set({ monthlyUsage: { ...usage, audioMinutesUsed: usage.audioMinutesUsed + durationMinutes } })
    .where(eq(users.id, userId));
}

/**
 * Refusal message when the user has no audio minutes left this month, else
 * null. Minutes are only counted when a recording is saved, so this can't
 * stop the one transcription that tips a user over; it stops the ones after.
 */
export async function audioQuotaExhausted(db: Db, userId: string, limit: number): Promise<string | null> {
  const usage = await getUserUsage(db, userId);
  return usage.audioMinutesUsed >= limit ? `You've used all ${limit} audio minutes for this month.` : null;
}
