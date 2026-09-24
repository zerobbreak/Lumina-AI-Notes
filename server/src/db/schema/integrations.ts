import { boolean, index, pgEnum, pgTable, text, unique } from "drizzle-orm/pg-core";
import { createdAt, id, timestamptz, updatedAt } from "./columns.js";
import { users } from "./users.js";

export const lmsProvider = pgEnum("lms_provider", ["brightspace"]);

/**
 * How we reach the LMS. `ical`: the student pasted their calendar subscribe
 * URL (due dates only, works at any school). `oauth`: the student signed in
 * through a school-registered app (submissions and grades too).
 */
export const lmsConnectionKind = pgEnum("lms_connection_kind", ["ical", "oauth"]);

/** `error`: the last sync failed and the student may need to reconnect. */
export const lmsConnectionStatus = pgEnum("lms_connection_status", ["active", "error"]);

/**
 * A student's link to their LMS. Signing in stays with Clerk; this is a data
 * source, not an identity (see docs/brightspace-account-linking.md).
 */
export const lmsConnections = pgTable(
  "lms_connections",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: lmsProvider().notNull(),
    kind: lmsConnectionKind().notNull(),
    /** The school's LMS host, e.g. "school.brightspace.com". API calls and links go here. */
    host: text().notNull(),
    /**
     * Sealed with integrations/secretBox. For `ical`, the feed URL: it carries
     * a token, so anyone holding it can read the calendar. For `oauth`, the
     * token pair as JSON. Never sent to the client.
     */
    secret: text().notNull(),
    /** When the OAuth access token expires; null for `ical`. */
    secretExpiresAt: timestamptz(),
    /** The student's id on the LMS (Brightspace whoami `Identifier`); null for `ical`. */
    externalUserId: text(),
    status: lmsConnectionStatus().notNull().default("active"),
    lastSyncedAt: timestamptz(),
    /** Why the last sync failed, in words fit for the student; cleared on success. */
    lastError: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  // One connection per LMS per student; reconnecting replaces it.
  (t) => [unique("lms_connections_user_provider").on(t.userId, t.provider)],
);

/**
 * Maps an LMS course to one of the student's Lumina courses (users.courses),
 * so synced deadlines land under the right course.
 */
export const lmsCourseLinks = pgTable(
  "lms_course_links",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    connectionId: text()
      .notNull()
      .references(() => lmsConnections.id, { onDelete: "cascade" }),
    /** Stable key for the course on the LMS: the org unit id (oauth) or the name the feed uses (ical). */
    externalKey: text().notNull(),
    externalName: text().notNull(),
    /** A course id from users.courses; null until the student maps it. */
    courseId: text(),
    /** The student chose not to sync this course. */
    ignored: boolean().notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("lms_course_links_connection_key").on(t.connectionId, t.externalKey),
    index().on(t.userId),
  ],
);
