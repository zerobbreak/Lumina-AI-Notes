import { pgEnum, pgTable, text, unique } from "drizzle-orm/pg-core";
import { createdAt, id } from "./columns.js";
import { users } from "./users.js";

export const announcementEventKind = pgEnum("announcement_event_kind", [
  "seen",
  "dismissed",
  "clicked",
]);

/**
 * What each user has done with each "What's new" announcement. The
 * announcements themselves live in the client's code registry, so
 * `announcementId` is a slug from there rather than a foreign key. One row per
 * (user, announcement, kind): the first time counts, repeats are no-ops.
 */
export const announcementEvents = pgTable(
  "announcement_events",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    announcementId: text().notNull(),
    kind: announcementEventKind().notNull(),
    at: createdAt(),
  },
  // Leads with userId, so it also serves the per-user reads.
  (t) => [unique("announcement_events_user_announcement_kind").on(t.userId, t.announcementId, t.kind)],
);
