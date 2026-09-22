import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, timestamptz, updatedAt } from "./columns.js";
import { users } from "./users.js";

export const deadlineKind = pgEnum("deadline_kind", ["assignment", "exam", "event", "task"]);

export const notificationType = pgEnum("notification_type", ["deadline_reminder"]);

export const deadlines = pgTable(
  "deadlines",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text().notNull(),
    dueAt: timestamptz().notNull(),
    kind: deadlineKind().notNull(),
    courseId: text(),
    moduleId: text(),
    notes: text(),
    completedAt: timestamptz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId, t.dueAt), index().on(t.userId, t.completedAt)],
);

export const deadlineReminders = pgTable(
  "deadline_reminders",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deadlineId: text()
      .notNull()
      .references(() => deadlines.id, { onDelete: "cascade" }),
    remindAt: timestamptz().notNull(),
    createdAt: createdAt(),
    sentAt: timestamptz(),
  },
  (t) => [
    index().on(t.userId, t.remindAt),
    index().on(t.deadlineId),
    // The reminder job only ever scans unsent reminders.
    index("deadline_reminders_due_idx")
      .on(t.remindAt)
      .where(sql`${t.sentAt} is null`),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationType().notNull(),
    title: text().notNull(),
    body: text(),
    href: text(),
    createdAt: createdAt(),
    readAt: timestamptz(),
  },
  (t) => [index().on(t.userId, t.createdAt), index().on(t.userId, t.readAt)],
);
