import { doublePrecision, index, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id } from "./columns.js";
import { users } from "./users.js";

export const recordings = pgTable(
  "recordings",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: text().notNull(),
    title: text().notNull(),
    transcript: text().notNull(),
    audioUrl: text(),
    /** Bucket object key for the audio, when stored by us. */
    audioStorageKey: text(),
    /** Seconds */
    duration: doublePrecision(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.sessionId), index().on(t.userId, t.createdAt)],
);
