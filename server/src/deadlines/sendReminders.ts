import { and, eq, gte, isNull, lte } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { deadlineReminders, deadlines, notifications } from "../db/schema/index.js";

/** Port of Convex sendDueRemindersInternal — run on a schedule (e.g. every 10 minutes). */
export async function sendDueReminders(db: Db, lookaheadMinutes = 10) {
  const lookahead = Math.max(1, Math.min(120, lookaheadMinutes));
  const now = Date.now();
  const end = now + lookahead * 60_000;

  const due = await db
    .select()
    .from(deadlineReminders)
    .where(
      and(
        isNull(deadlineReminders.sentAt),
        gte(deadlineReminders.remindAt, new Date(now)),
        lte(deadlineReminders.remindAt, new Date(end)),
      ),
    );

  let sent = 0;
  for (const r of due) {
    const [d] = await db.select().from(deadlines).where(eq(deadlines.id, r.deadlineId)).limit(1);
    if (!d || d.completedAt) {
      await db
        .update(deadlineReminders)
        .set({ sentAt: new Date(now) })
        .where(eq(deadlineReminders.id, r.id));
      continue;
    }

    const msUntil = d.dueAt.getTime() - now;
    const minutesUntil = Math.round(msUntil / 60_000);
    const when =
      minutesUntil <= 0
        ? "now"
        : minutesUntil < 60
          ? `in ${minutesUntil}m`
          : `in ${Math.round(minutesUntil / 60)}h`;

    await db.insert(notifications).values({
      userId: d.userId,
      type: "deadline_reminder",
      title: `${d.title} is due ${when}`,
      body: d.notes,
      href: "/dashboard?view=calendar",
    });

    await db
      .update(deadlineReminders)
      .set({ sentAt: new Date(now) })
      .where(eq(deadlineReminders.id, r.id));
    sent += 1;
  }

  return { sent };
}
