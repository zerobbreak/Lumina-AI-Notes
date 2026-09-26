import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, timestamptz } from "./columns.js";
import { users } from "./users.js";

/**
 * In-app feedback. Also sent to the Google Form (feedback/googleForm.ts);
 * this copy means nothing is lost if that fails, and caps how much one
 * account can send. Deleted with the account.
 */
export const feedback = pgTable(
  "feedback",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** "bug" | "idea" | "more" | "praise" | "other" */
    kind: text().notNull(),
    message: text().notNull(),
    /** 1-5, optional. */
    rating: integer(),
    /** App path the user was on, e.g. "/dashboard?view=studio". */
    page: text(),
    /** The API error code, when sent from a "you've hit a limit" notice. */
    limitCode: text(),
    /** "web" or "desktop", plus the browser. */
    app: text(),
    /** When the Google Form accepted it; null if the form isn't set up or refused it. */
    forwardedAt: timestamptz(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.createdAt), index().on(t.createdAt)],
);
