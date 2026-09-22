import { index, pgEnum, pgTable, text, unique } from "drizzle-orm/pg-core";
import { createdAt, id, timestamptz } from "./columns.js";
import { notes } from "./notes.js";
import { users } from "./users.js";

export const collaboratorRole = pgEnum("collaborator_role", ["viewer", "editor"]);

/** Who has a note open right now. Rows older than the heartbeat window are stale. */
export const presence = pgTable(
  "presence",
  {
    id: id(),
    noteId: text()
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userName: text(),
    userImage: text(),
    lastSeen: timestamptz().notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.noteId), index().on(t.noteId), index().on(t.lastSeen)],
);

export const noteCollaborators = pgTable(
  "note_collaborators",
  {
    id: id(),
    noteId: text()
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: collaboratorRole().notNull(),
    addedAt: createdAt(),
    // Nullable so removing the inviter's account doesn't revoke access they granted.
    addedBy: text().references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [unique().on(t.noteId, t.userId), index().on(t.userId)],
);

export const noteInvites = pgTable(
  "note_invites",
  {
    id: id(),
    noteId: text()
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    /** Normalised to lowercase */
    email: text().notNull(),
    role: collaboratorRole().notNull(),
    invitedBy: text().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    acceptedAt: timestamptz(),
    acceptedBy: text().references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [unique().on(t.noteId, t.email), index().on(t.email)],
);
