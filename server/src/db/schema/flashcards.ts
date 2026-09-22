import { doublePrecision, index, integer, pgTable, text, unique } from "drizzle-orm/pg-core";
import { createdAt, id, searchVector, timestamptz, updatedAt } from "./columns.js";
import { notes } from "./notes.js";
import { users } from "./users.js";

export const flashcardDecks = pgTable(
  "flashcard_decks",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text().notNull(),
    sourceNoteId: text().references(() => notes.id, { onDelete: "set null" }),
    courseId: text(),
    cardCount: integer().notNull().default(0),
    createdAt: createdAt(),
    lastStudiedAt: timestamptz(),
    examDate: timestamptz(),
    searchTitle: searchVector("title"),
  },
  (t) => [
    index().on(t.userId),
    index("flashcard_decks_search_title_idx").using("gin", t.searchTitle),
  ],
);

export const flashcards = pgTable(
  "flashcards",
  {
    id: id(),
    // Optional in Convex (older cards predate it); the deck always knows the owner.
    userId: text().references(() => users.id, { onDelete: "cascade" }),
    deckId: text()
      .notNull()
      .references(() => flashcardDecks.id, { onDelete: "cascade" }),
    front: text().notNull(),
    back: text().notNull(),
    // Convex ordered cards by _creationTime. Bulk inserts share one now(), so
    // keep the order explicitly.
    position: integer().notNull().default(0),
    difficulty: doublePrecision(),
    nextReviewAt: timestamptz(),
    reviewCount: integer(),
    lastReviewedAt: timestamptz(),
    // SM-2 scheduling
    easeFactor: doublePrecision(),
    /** Days */
    interval: doublePrecision(),
    repetitions: integer(),
    lastRating: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.deckId, t.nextReviewAt),
    index().on(t.deckId, t.position),
    index().on(t.userId, t.nextReviewAt),
  ],
);

/** The day's review list for a user, so a session survives reloads. */
export const flashcardReviewQueues = pgTable(
  "flashcard_review_queues",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Start of the user's local day */
    date: timestamptz().notNull(),
    // Ordered, and read whole; card deletions are tolerated at read time.
    cardIds: text().array().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique().on(t.userId, t.date)],
);

export const flashcardReviewEvents = pgTable(
  "flashcard_review_events",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deckId: text()
      .notNull()
      .references(() => flashcardDecks.id, { onDelete: "cascade" }),
    cardId: text()
      .notNull()
      .references(() => flashcards.id, { onDelete: "cascade" }),
    /** "easy" | "medium" | "hard" */
    rating: text().notNull(),
    reviewedAt: timestamptz().notNull().defaultNow(),
  },
  (t) => [
    index().on(t.userId, t.reviewedAt),
    index().on(t.deckId, t.reviewedAt),
    index().on(t.cardId),
  ],
);
