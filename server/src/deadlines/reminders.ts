import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { deadlineReminders } from "../db/schema/index.js";

const DEFAULT_REMINDER_OFFSETS_MINUTES = [24 * 60, 2 * 60, 30, 0] as const;

export function buildReminderTimes(dueAtMs: number, nowMs: number) {
  const times = DEFAULT_REMINDER_OFFSETS_MINUTES.map((m) => dueAtMs - m * 60_000);
  return [...new Set(times)].filter((t) => t >= nowMs);
}

export async function deleteRemindersForDeadline(db: Db, deadlineId: string) {
  await db.delete(deadlineReminders).where(eq(deadlineReminders.deadlineId, deadlineId));
}

export async function createRemindersForDeadline(
  db: Db,
  args: { userId: string; deadlineId: string; dueAt: Date },
) {
  const nowMs = Date.now();
  const remindTimes = buildReminderTimes(args.dueAt.getTime(), nowMs);
  if (remindTimes.length === 0) return;

  await db.insert(deadlineReminders).values(
    remindTimes.map((remindAt) => ({
      userId: args.userId,
      deadlineId: args.deadlineId,
      remindAt: new Date(remindAt),
    })),
  );
}
