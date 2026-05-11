import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const DEFAULT_REMINDER_OFFSETS_MINUTES = [24 * 60, 2 * 60, 30, 0] as const;

function requireIdentity(identity: Awaited<ReturnType<any>>) {
  if (!identity) throw new Error("Unauthorized");
  return identity as { tokenIdentifier: string };
}

function buildReminderTimes(dueAt: number, now: number) {
  const times = DEFAULT_REMINDER_OFFSETS_MINUTES.map((m) => dueAt - m * 60_000);
  return [...new Set(times)].filter((t) => t >= now);
}

async function deleteRemindersForDeadline(ctx: any, deadlineId: Id<"deadlines">) {
  const reminders = await ctx.db
    .query("deadlineReminders")
    .withIndex("by_deadlineId", (q: any) => q.eq("deadlineId", deadlineId))
    .collect();
  for (const r of reminders) await ctx.db.delete(r._id);
}

async function createRemindersForDeadline(ctx: any, args: { userId: string; deadlineId: Id<"deadlines">; dueAt: number }) {
  const now = Date.now();
  const remindTimes = buildReminderTimes(args.dueAt, now);
  for (const remindAt of remindTimes) {
    await ctx.db.insert("deadlineReminders", {
      userId: args.userId,
      deadlineId: args.deadlineId,
      remindAt,
      createdAt: now,
    });
  }
}

export const createDeadline = mutation({
  args: {
    title: v.string(),
    dueAt: v.number(),
    kind: v.union(
      v.literal("assignment"),
      v.literal("exam"),
      v.literal("event"),
      v.literal("task"),
    ),
    courseId: v.optional(v.string()),
    moduleId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = requireIdentity(await ctx.auth.getUserIdentity());
    const now = Date.now();

    const id = await ctx.db.insert("deadlines", {
      userId: identity.tokenIdentifier,
      title: args.title,
      dueAt: args.dueAt,
      kind: args.kind,
      courseId: args.courseId,
      moduleId: args.moduleId,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    await createRemindersForDeadline(ctx, {
      userId: identity.tokenIdentifier,
      deadlineId: id,
      dueAt: args.dueAt,
    });

    return id;
  },
});

export const updateDeadline = mutation({
  args: {
    deadlineId: v.id("deadlines"),
    title: v.optional(v.string()),
    dueAt: v.optional(v.number()),
    kind: v.optional(
      v.union(
        v.literal("assignment"),
        v.literal("exam"),
        v.literal("event"),
        v.literal("task"),
      ),
    ),
    courseId: v.optional(v.string()),
    moduleId: v.optional(v.string()),
    notes: v.optional(v.string()),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = requireIdentity(await ctx.auth.getUserIdentity());
    const existing = await ctx.db.get(args.deadlineId);
    if (!existing) throw new Error("Deadline not found");
    if (existing.userId !== identity.tokenIdentifier) throw new Error("Forbidden");

    const now = Date.now();
    const patch: Partial<Doc<"deadlines">> & Record<string, unknown> = {
      updatedAt: now,
    };

    if (args.title !== undefined) patch.title = args.title;
    if (args.kind !== undefined) patch.kind = args.kind;
    if (args.courseId !== undefined) patch.courseId = args.courseId;
    if (args.moduleId !== undefined) patch.moduleId = args.moduleId;
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.dueAt !== undefined) patch.dueAt = args.dueAt;

    if (args.completed !== undefined) {
      patch.completedAt = args.completed ? now : undefined;
    }

    await ctx.db.patch(args.deadlineId, patch);

    // Reschedule reminders if due date changed or completion toggled.
    const dueAtNext = (args.dueAt ?? existing.dueAt) as number;
    const completedNext =
      args.completed === undefined ? existing.completedAt != null : args.completed;
    await deleteRemindersForDeadline(ctx, args.deadlineId);
    if (!completedNext) {
      await createRemindersForDeadline(ctx, {
        userId: identity.tokenIdentifier,
        deadlineId: args.deadlineId,
        dueAt: dueAtNext,
      });
    }
  },
});

export const deleteDeadline = mutation({
  args: { deadlineId: v.id("deadlines") },
  handler: async (ctx, args) => {
    const identity = requireIdentity(await ctx.auth.getUserIdentity());
    const existing = await ctx.db.get(args.deadlineId);
    if (!existing) return;
    if (existing.userId !== identity.tokenIdentifier) throw new Error("Forbidden");

    await deleteRemindersForDeadline(ctx, args.deadlineId);
    await ctx.db.delete(args.deadlineId);
  },
});

export const getUpcoming = query({
  args: {
    limit: v.optional(v.number()),
    windowDays: v.optional(v.number()),
    includeCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const uid = identity.tokenIdentifier;

    const limit = Math.max(1, Math.min(50, args.limit ?? 8));
    const windowDays = Math.max(1, Math.min(365, args.windowDays ?? 30));
    const now = Date.now();
    const end = now + windowDays * 24 * 60 * 60 * 1000;

    const items = await ctx.db
      .query("deadlines")
      .withIndex("by_userId_dueAt", (q: any) =>
        q.eq("userId", uid).gte("dueAt", now).lte("dueAt", end),
      )
      .collect();

    const filtered = args.includeCompleted
      ? items
      : items.filter((d: any) => d.completedAt == null);

    filtered.sort((a: any, b: any) => a.dueAt - b.dueAt);
    return filtered.slice(0, limit);
  },
});

/**
 * Cron target: turns due reminders into in-app notifications.
 */
export const sendDueRemindersInternal = internalMutation({
  args: { lookaheadMinutes: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const lookaheadMinutes = Math.max(1, Math.min(120, args.lookaheadMinutes ?? 10));
    const now = Date.now();
    const end = now + lookaheadMinutes * 60_000;

    const due = await ctx.db
      .query("deadlineReminders")
      .withIndex("by_remindAt", (q: any) => q.gte("remindAt", now).lte("remindAt", end))
      .collect();

    let sent = 0;
    for (const r of due) {
      if (r.sentAt != null) continue;
      const d = await ctx.db.get(r.deadlineId);
      if (!d) {
        await ctx.db.patch(r._id, { sentAt: now });
        continue;
      }
      if (d.completedAt != null) {
        await ctx.db.patch(r._id, { sentAt: now });
        continue;
      }

      const msUntil = d.dueAt - now;
      const minutesUntil = Math.round(msUntil / 60_000);
      const when =
        minutesUntil <= 0
          ? "now"
          : minutesUntil < 60
            ? `in ${minutesUntil}m`
            : `in ${Math.round(minutesUntil / 60)}h`;

      await ctx.db.insert("notifications", {
        userId: d.userId,
        type: "deadline_reminder",
        title: `${d.title} is due ${when}`,
        body: d.notes,
        href: "/dashboard?view=calendar",
        createdAt: now,
      });

      await ctx.db.patch(r._id, { sentAt: now });
      sent += 1;
    }

    return { sent };
  },
});

