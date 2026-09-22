import { index, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./columns.js";
import { users } from "./users.js";

export const chatMode = pgEnum("chat_mode", [
  "explain",
  "synthesize",
  "compare",
  "apply",
  "quiz",
  "fill_gaps",
]);

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text().notNull(),
    // Ordered note ids; deleted notes are skipped at read time, as in Convex.
    pinnedNoteIds: text().array(),
    mode: chatMode(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId, t.updatedAt)],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: id(),
    sessionId: text()
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    /** "user" | "assistant" */
    role: text().notNull(),
    content: text().notNull(),
    contextNoteIds: text().array(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.sessionId, t.createdAt)],
);
