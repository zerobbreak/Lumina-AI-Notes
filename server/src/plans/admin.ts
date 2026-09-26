import { desc, eq, gte, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { aiDailyUsage, aiUsageEvents, users } from "../db/schema/index.js";
import { normalizeUsage } from "../recordings/usage.js";
import { LIMIT_KEYS, limitsFor, type LimitOverrides } from "./limits.js";

const UNITS: Record<string, number> = { kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };

/**
 * Parses `key=value` pairs from the command line into overrides. Sizes take
 * KB/MB/GB ("storageBytes=2GB"); everything else is a plain number.
 */
export function parseOverrides(args: string[]): LimitOverrides {
  const overrides: LimitOverrides = {};
  for (const arg of args) {
    const [key, raw] = arg.split("=");
    if (!(LIMIT_KEYS as readonly string[]).includes(key) || raw === undefined) {
      throw new Error(`Unknown limit "${arg}". Use key=value with one of: ${LIMIT_KEYS.join(", ")}`);
    }
    const match = /^(\d+(?:\.\d+)?)\s*(kb|mb|gb)?$/i.exec(raw.trim());
    if (!match) throw new Error(`"${raw}" isn't a number (sizes can end in KB, MB or GB)`);
    const value = Number(match[1]) * (match[2] ? UNITS[match[2].toLowerCase()] : 1);
    overrides[key as keyof LimitOverrides] = Math.round(value);
  }
  return overrides;
}

async function findUserByEmail(db: Db, email: string) {
  const matches = await db.select().from(users).where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
  if (matches.length === 0) throw new Error(`No user with email ${email}`);
  if (matches.length > 1) throw new Error(`${matches.length} users share ${email}; set limit_overrides by id instead`);
  return matches[0];
}

/**
 * Merges `overrides` into the user's existing ones, or clears them all when
 * `overrides` is null. Returns the limits they end up with.
 */
export async function setUserLimits(db: Db, email: string, overrides: LimitOverrides | null) {
  const user = await findUserByEmail(db, email);
  const next = overrides === null ? null : { ...user.limitOverrides, ...overrides };
  const [updated] = await db.update(users).set({ limitOverrides: next }).where(eq(users.id, user.id)).returning();
  return { email: updated.email, overrides: updated.limitOverrides, limits: limitsFor(updated) };
}

export type UserUsageRow = {
  email: string;
  plan: string;
  aiCalls: number;
  /** Days in the window the user hit their daily AI limit. */
  daysAtLimit: number;
  inputTokens: number;
  outputTokens: number;
  audioMinutesThisMonth: number;
};

/** What each user did over the last `days` days, heaviest AI users first. */
export async function usageByUser(db: Db, days: number, now = Date.now()): Promise<UserUsageRow[]> {
  const since = new Date(now - days * 24 * 60 * 60 * 1000);
  const sinceDay = since.toISOString().slice(0, 10);

  const [userRows, calls, tokens] = await Promise.all([
    db.select().from(users),
    db
      .select({ userId: aiDailyUsage.userId, day: aiDailyUsage.day, count: aiDailyUsage.count })
      .from(aiDailyUsage)
      .where(gte(aiDailyUsage.day, sinceDay)),
    db
      .select({
        userId: aiUsageEvents.userId,
        input: sql<number>`coalesce(sum(${aiUsageEvents.inputTokens}), 0)::int`,
        output: sql<number>`coalesce(sum(${aiUsageEvents.outputTokens}), 0)::int`,
      })
      .from(aiUsageEvents)
      .where(gte(aiUsageEvents.createdAt, since))
      .groupBy(aiUsageEvents.userId),
  ]);

  const tokensByUser = new Map(tokens.map((row) => [row.userId, row]));
  return userRows
    .map((user) => {
      const limit = limitsFor(user).aiCallsPerDay;
      const own = calls.filter((row) => row.userId === user.id);
      const spent = tokensByUser.get(user.id);
      return {
        email: user.email,
        plan: limitsFor(user).plan,
        aiCalls: own.reduce((sum, row) => sum + row.count, 0),
        daysAtLimit: own.filter((row) => row.count >= limit).length,
        inputTokens: Number(spent?.input ?? 0),
        outputTokens: Number(spent?.output ?? 0),
        audioMinutesThisMonth: normalizeUsage(user.monthlyUsage, now).audioMinutesUsed,
      };
    })
    .filter((row) => row.aiCalls > 0 || row.inputTokens > 0 || row.audioMinutesThisMonth > 0)
    .sort((a, b) => b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens) || b.aiCalls - a.aiCalls);
}

/** Token spend per feature over the last `days` days, biggest first. */
export async function usageByFeature(db: Db, days: number, now = Date.now()) {
  const since = new Date(now - days * 24 * 60 * 60 * 1000);
  const total = sql<number>`coalesce(sum(${aiUsageEvents.totalTokens}), 0)::int`;
  return db
    .select({
      feature: aiUsageEvents.feature,
      calls: sql<number>`count(*)::int`,
      inputTokens: sql<number>`coalesce(sum(${aiUsageEvents.inputTokens}), 0)::int`,
      outputTokens: sql<number>`coalesce(sum(${aiUsageEvents.outputTokens}), 0)::int`,
      totalTokens: total,
    })
    .from(aiUsageEvents)
    .where(gte(aiUsageEvents.createdAt, since))
    .groupBy(aiUsageEvents.feature)
    .orderBy(desc(total));
}
